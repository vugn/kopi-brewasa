import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trash2, Plus, Image as ImageIcon, Loader2, Pencil, X, ChefHat, Printer } from 'lucide-react';
import { MenuItem } from '../../types';

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    price_per_unit: number;
}

interface RecipeItem {
    id: string; // recipe id
    ingredient_id: string;
    quantity_required: number;
    ingredients?: Ingredient; // joined data
}

// We extend MenuItem for local state but Supabase types might vary slightly
interface AdminMenuItem extends MenuItem {
    // Supabase returns these
}

interface PrintRecipeData {
    menuName: string;
    items: RecipeItem[];
}

const MenuManager: React.FC = () => {
    const [items, setItems] = useState<AdminMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        price: '',
        image: '',
        tags: '',
        forWhat: '',
        category: 'MAIN',
        isAvailable: true
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Recipe Modal State
    const [recipeModalOpen, setRecipeModalOpen] = useState(false);
    const [selectedMenuForRecipe, setSelectedMenuForRecipe] = useState<AdminMenuItem | null>(null);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
    const [newRecipeItem, setNewRecipeItem] = useState({ ingredient_id: '', quantity: 0 });

    // Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const [printData, setPrintData] = useState<PrintRecipeData[]>([]);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .select('*')
            .order('category', { ascending: false })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching menu:', error);
        } else {
            setItems(data?.map((item: any) => ({
                ...item,
                ...item,
                forWhat: item.for_what,
                isAvailable: item.is_available
            })) || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus menu ini?')) return;

        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Gagal menghapus: ' + error.message);
        } else {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const handleEdit = (item: AdminMenuItem) => {
        setEditingId(item.id);
        setNewItem({
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            tags: item.tags.join(', '),

            forWhat: item.forWhat,
            category: item.category || 'MAIN',
            isAvailable: item.is_available ?? true
        });
        setSelectedFile(null); // Reset file selection for edit
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewItem({
            name: '',
            description: '',
            price: '',
            image: '',
            tags: '',
            forWhat: '',
            category: 'MAIN',
            isAvailable: true
        });
        setSelectedFile(null);
    };

    const uploadImage = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let imageUrl = newItem.image;

            if (selectedFile) {
                setUploading(true);
                imageUrl = await uploadImage(selectedFile);
                setUploading(false);
            }

            // Using default image if no image provided or uploaded
            if (!imageUrl) {
                imageUrl = 'https://picsum.photos/400/300';
            }

            const tagsArray = newItem.tags.split(',').map(t => t.trim());
            const payload = {
                name: newItem.name,
                description: newItem.description,
                price: newItem.price,
                image: imageUrl,
                tags: tagsArray,
                for_what: newItem.forWhat,
                category: newItem.category,
                is_available: newItem.isAvailable
            };

            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('menu_items')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert('Menu berhasil diupdate!');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('menu_items')
                    .insert([payload]);

                if (error) throw error;
                alert('Menu berhasil ditambah!');
            }

            handleCancelEdit();
            fetchItems();

        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    // Recipe Logic
    const openRecipeModal = async (menuItem: AdminMenuItem) => {
        setSelectedMenuForRecipe(menuItem);
        setRecipeModalOpen(true);

        // Fetch recipes for this menu
        const { data: recipes } = await supabase
            .from('menu_recipes')
            .select('*, ingredients(*)')
            .eq('menu_item_id', menuItem.id);

        if (recipes) setRecipeItems(recipes);

        // Fetch ingredients for dropdown
        const { data: ingredients } = await supabase.from('ingredients').select('*').order('name');
        if (ingredients) setAvailableIngredients(ingredients);
    };

    const addIngredientToRecipe = async () => {
        if (!selectedMenuForRecipe || !newRecipeItem.ingredient_id) return;

        const { error } = await supabase.from('menu_recipes').insert([{
            menu_item_id: selectedMenuForRecipe.id,
            ingredient_id: newRecipeItem.ingredient_id,
            quantity_required: newRecipeItem.quantity
        }]);

        if (error) alert('Gagal tambah resep');
        else {
            // refresh
            const { data } = await supabase.from('menu_recipes').select('*, ingredients(*)').eq('menu_item_id', selectedMenuForRecipe.id);
            if (data) setRecipeItems(data);
            setNewRecipeItem({ ingredient_id: '', quantity: 0 });
        }
    };

    const removeIngredientFromRecipe = async (id: string) => {
        await supabase.from('menu_recipes').delete().eq('id', id);
        setRecipeItems(recipeItems.filter(r => r.id !== id));
    };

    const handlePrintRecipes = async () => {
        setLoading(true);
        // Fetch all menu items and their recipes
        const { data: allMenus } = await supabase
            .from('menu_items')
            .select('id, name')
            .order('name');

        if (!allMenus) {
            setLoading(false);
            return;
        }

        const recipePromises = allMenus.map(async (menu) => {
            const { data: recipes } = await supabase
                .from('menu_recipes')
                .select('*, ingredients(*)')
                .eq('menu_item_id', menu.id);

            return {
                menuName: menu.name,
                items: recipes || []
            };
        });

        const results = await Promise.all(recipePromises);
        // Filter out menus with no recipes
        setPrintData(results.filter(r => r.items.length > 0));
        setIsPrinting(true);
        setLoading(false);
    };

    if (isPrinting) {
        return (
            <div className="bg-white min-h-screen p-8 absolute inset-0 z-50">
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <h1 className="text-3xl font-bold">Laporan Resep Menu</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.print()}
                            className="bg-brewasa-dark text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            <Printer className="w-5 h-5" /> Cetak / PDF
                        </button>
                        <button
                            onClick={() => setIsPrinting(false)}
                            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold"
                        >
                            Tutup
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    {printData.map((data, idx) => (
                        <div key={idx} className="break-inside-avoid border-b pb-6">
                            <h2 className="text-xl font-bold mb-3 text-brewasa-dark">{data.menuName}</h2>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-200">
                                        <th className="py-2 px-4 font-semibold w-1/2">Bahan Baku</th>
                                        <th className="py-2 px-4 font-semibold w-1/4">Jumlah</th>
                                        <th className="py-2 px-4 font-semibold w-1/4 text-right">Estimasi Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(item => {
                                        const cost = item.ingredients ? (item.ingredients.price_per_unit * item.quantity_required) : 0;
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100">
                                                <td className="py-2 px-4">{item.ingredients?.name}</td>
                                                <td className="py-2 px-4">{item.quantity_required} {item.ingredients?.unit}</td>
                                                <td className="py-2 px-4 text-right text-gray-500">Rp {cost.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Cost Row */}
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="py-2 px-4" colSpan={2}>Total HPP</td>
                                        <td className="py-2 px-4 text-right">
                                            Rp {data.items.reduce((sum, item) => sum + (item.ingredients ? (item.ingredients.price_per_unit * item.quantity_required) : 0), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-brewasa-dark">Menu Manager</h2>

            {/* Add/Edit Form */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border ${editingId ? 'border-brewasa-copper ring-1 ring-brewasa-copper' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {editingId ? <Pencil className="w-5 h-5 text-brewasa-copper" /> : <Plus className="w-5 h-5" />}
                        {editingId ? 'Edit Menu' : 'Tambah Menu Baru'}
                    </h3>
                    <div className="flex gap-4">
                        {!editingId && (
                            <button
                                onClick={handlePrintRecipes}
                                className="text-sm bg-gray-100 hover:bg-gray-200 text-brewasa-dark px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                            >
                                <Printer className="w-4 h-4" /> Cetak Resep
                            </button>
                        )}
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                <X className="w-4 h-4" /> Batal Edit
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        placeholder="Nama Menu (Contoh: Kopi Susu Senja)"
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <input
                            placeholder="Harga (Contoh: 25k)"
                            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 w-full"
                            value={newItem.price}
                            onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                            required
                        />
                        <select
                            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 w-full"
                            value={newItem.category}
                            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                        >
                            <option value="MAIN">Utama (Main)</option>
                            <option value="ADDON">Addon / Extra</option>
                            <option value="SPECIAL">Special</option>
                        </select>
                    </div>
                    <textarea
                        placeholder="Deskripsi"
                        className="p-3 border rounded-lg md:col-span-2 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.description}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        required
                    />
                    <input
                        placeholder="Tags (pisahkan dengan koma: Creamy, Bold)"
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.tags}
                        onChange={e => setNewItem({ ...newItem, tags: e.target.value })}
                    />
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Foto Menu</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-dashed border-gray-300">
                                <ImageIcon className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                    {selectedFile ? selectedFile.name : 'Pilih Foto...'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedFile(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                            <span className="text-xs text-gray-400">atau</span>
                            <input
                                placeholder="Paste Image URL (Opsional)"
                                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-sm"
                                value={newItem.image}
                                onChange={e => setNewItem({ ...newItem, image: e.target.value })}
                            />
                        </div>
                        {newItem.image && !selectedFile && (
                            <div className="mt-2 relative w-16 h-16">
                                <img src={newItem.image} alt="Preview" className="w-full h-full object-cover rounded-lg border" />
                            </div>
                        )}
                        {selectedFile && (
                            <p className="text-xs text-green-600 mt-1">File terpilih: {selectedFile.name}</p>
                        )}
                    </div>
                    <textarea
                        placeholder="Untuk Apa? (Filosofi/Alasan Emotional)"
                        className="p-3 border rounded-lg md:col-span-2 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.forWhat}
                        onChange={e => setNewItem({ ...newItem, forWhat: e.target.value })}
                    />
                    <div className="md:col-span-2 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border">
                        <input
                            type="checkbox"
                            id="isAvailable"
                            className="w-5 h-5 text-brewasa-copper rounded focus:ring-brewasa-copper"
                            checked={newItem.isAvailable}
                            onChange={e => setNewItem({ ...newItem, isAvailable: e.target.checked })}
                        />
                        <label htmlFor="isAvailable" className="text-gray-700 font-medium cursor-pointer select-none">
                            Tampilkan di Menu POS (Available)
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`text-white p-3 rounded-lg font-bold md:col-span-2 transition-colors disabled:opacity-50 ${editingId ? 'bg-brewasa-copper hover:bg-orange-600' : 'bg-brewasa-dark hover:bg-gray-800'}`}
                    >
                        {submitting || uploading ? 'Menyimpan...' : (editingId ? 'Update Menu' : 'Simpan Menu')}
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Menu</th>
                                <th className="p-4 font-semibold text-gray-600">Harga</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.length === 0 && (
                                <tr><td colSpan={3} className="p-8 text-center text-gray-400">Belum ada menu.</td></tr>
                            )}
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                        <div>
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${item.category === 'ADDON' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                    {item.category || 'MAIN'}
                                                </span>
                                                {!item.is_available && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold border bg-gray-100 text-gray-500 border-gray-300">
                                                        HIDDEN
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-brewasa-dark">{item.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-sm">{item.price}</td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Menu"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => openRecipeModal(item)}
                                            className="text-amber-500 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                            title="Atur Resep (HPP)"
                                        >
                                            <ChefHat className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus Menu"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recipe Modal */}
            {recipeModalOpen && selectedMenuForRecipe && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Resep: {selectedMenuForRecipe.name}</h3>
                            <button onClick={() => setRecipeModalOpen(false)}><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-2">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 text-sm">Bahan</th>
                                        <th className="p-2 text-sm">Qty</th>
                                        <th className="p-2 text-sm">Cost</th>
                                        <th className="p-2 text-sm"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipeItems.map(r => {
                                        const cost = r.ingredients ? (r.ingredients.price_per_unit * r.quantity_required) : 0;
                                        return (
                                            <tr key={r.id} className="border-b">
                                                <td className="p-2 text-sm">{r.ingredients?.name}</td>
                                                <td className="p-2 text-sm">{r.quantity_required} {r.ingredients?.unit}</td>
                                                <td className="p-2 text-sm text-gray-500">Rp {cost.toLocaleString()}</td>
                                                <td className="p-2 text-right">
                                                    <button onClick={() => removeIngredientFromRecipe(r.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <h4 className="font-bold text-sm">Tambah Bahan:</h4>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 p-2 border rounded text-sm"
                                    value={newRecipeItem.ingredient_id}
                                    onChange={e => setNewRecipeItem({ ...newRecipeItem, ingredient_id: e.target.value })}
                                >
                                    <option value="">Pilih Bahan...</option>
                                    {availableIngredients.map(i => (
                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    className="w-20 p-2 border rounded text-sm"
                                    placeholder="Qty"
                                    value={newRecipeItem.quantity || ''}
                                    onChange={e => setNewRecipeItem({ ...newRecipeItem, quantity: parseFloat(e.target.value) })}
                                />
                            </div>
                            <button
                                onClick={addIngredientToRecipe}
                                disabled={!newRecipeItem.ingredient_id || !newRecipeItem.quantity}
                                className="w-full bg-brewasa-dark text-white py-2 rounded font-bold disabled:opacity-50"
                            >
                                + Tambahkan ke Resep
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default MenuManager;
