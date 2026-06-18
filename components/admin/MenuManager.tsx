import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trash2, Plus, Image as ImageIcon, Loader2, Pencil, X, ChefHat, Printer, Package, Save, ListOrdered } from 'lucide-react';
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
    isAvailable?: boolean;
    manual_recipe?: string;
}

interface PrintRecipeData {
    menuName: string;
    manualRecipe: string;
    items: RecipeItem[];
}

type PrintMode = 'complete' | 'manual';

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
        isAvailable: true,
        isConsignment: false,
        consignmentCost: ''
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Recipe Modal State
    const [recipeModalOpen, setRecipeModalOpen] = useState(false);
    const [selectedMenuForRecipe, setSelectedMenuForRecipe] = useState<AdminMenuItem | null>(null);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
    const [newRecipeItem, setNewRecipeItem] = useState({ ingredient_id: '', quantity: 0 });
    const [manualRecipeText, setManualRecipeText] = useState('');
    const [savingManualRecipe, setSavingManualRecipe] = useState(false);

    // Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const [printMode, setPrintMode] = useState<PrintMode>('complete');
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
                forWhat: item.for_what,
                isAvailable: item.is_available,
                is_consignment: item.is_consignment ?? false,
                consignment_cost: item.consignment_cost ?? 0,
                manualRecipe: item.manual_recipe ?? ''
            })) || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Yakin ingin menghapus menu ini?')) return;

        const { count, error: countError } = await supabase
            .from('transaction_items')
            .select('id', { count: 'exact', head: true })
            .eq('menu_item_id', id);

        if (countError) {
            alert('Gagal mengecek histori transaksi: ' + countError.message);
            return;
        }

        if ((count ?? 0) > 0) {
            const { error: hideError } = await supabase
                .from('menu_items')
                .update({ is_available: false })
                .eq('id', id);

            if (hideError) {
                alert('Menu pernah dipakai transaksi dan gagal disembunyikan: ' + hideError.message);
                return;
            }

            setItems(items.map(item =>
                item.id === id ? { ...item, is_available: false, isAvailable: false } : item
            ));
            alert('Menu sudah pernah dipakai transaksi, jadi disembunyikan agar histori tetap aman.');
            return;
        }

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
            isAvailable: item.is_available ?? true,
            isConsignment: item.is_consignment ?? false,
            consignmentCost: item.consignment_cost ? String(item.consignment_cost) : ''
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
            isAvailable: true,
            isConsignment: false,
            consignmentCost: ''
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
                is_available: newItem.isAvailable,
                is_consignment: newItem.isConsignment,
                consignment_cost: newItem.isConsignment ? (parseInt(newItem.consignmentCost) || 0) : 0
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
        setManualRecipeText(menuItem.manual_recipe ?? menuItem.manualRecipe ?? '');
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

    const saveManualRecipe = async () => {
        if (!selectedMenuForRecipe) return;

        setSavingManualRecipe(true);
        const { error } = await supabase
            .from('menu_items')
            .update({ manual_recipe: manualRecipeText })
            .eq('id', selectedMenuForRecipe.id);

        setSavingManualRecipe(false);

        if (error) {
            alert('Gagal menyimpan resep manual: ' + error.message);
            return;
        }

        setItems(items.map(item =>
            item.id === selectedMenuForRecipe.id
                ? { ...item, manual_recipe: manualRecipeText, manualRecipe: manualRecipeText }
                : item
        ));
        setSelectedMenuForRecipe({
            ...selectedMenuForRecipe,
            manual_recipe: manualRecipeText,
            manualRecipe: manualRecipeText
        });
        alert('Resep manual berhasil disimpan!');
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

    const handlePrintRecipes = async (mode: PrintMode = 'complete') => {
        setLoading(true);
        setPrintMode(mode);
        // Fetch all menu items and their recipes
        const { data: allMenus } = await supabase
            .from('menu_items')
            .select('id, name, manual_recipe')
            .order('name');

        if (!allMenus) {
            setLoading(false);
            return;
        }

        if (mode === 'manual') {
            setPrintData(allMenus
                .map((menu) => ({
                    menuName: menu.name,
                    manualRecipe: menu.manual_recipe || '',
                    items: []
                }))
                .filter((menu) => menu.manualRecipe.trim().length > 0));
            setIsPrinting(true);
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
                manualRecipe: menu.manual_recipe || '',
                items: recipes || []
            };
        });

        const results = await Promise.all(recipePromises);
        // Filter out menus with no recipe content
        setPrintData(results.filter(r => r.items.length > 0 || r.manualRecipe.trim().length > 0));
        setIsPrinting(true);
        setLoading(false);
    };

    if (isPrinting) {
        const manualPrintData = printData.filter(data => data.manualRecipe.trim().length > 0);
        const manualRecipeCharCount = manualPrintData.reduce((sum, data) => sum + data.menuName.length + data.manualRecipe.length, 0);
        const manualDensityClass = manualRecipeCharCount > 5200 ? 'manual-density-xs' : manualRecipeCharCount > 3200 ? 'manual-density-sm' : 'manual-density-md';

        if (printMode === 'manual') {
            return (
                <div className="bg-white min-h-screen absolute inset-0 z-50">
                    <style>{`
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 7mm;
                            }

                            html,
                            body,
                            #root {
                                width: 210mm;
                                min-height: 297mm;
                                background: #ffffff !important;
                            }

                            .manual-print-shell {
                                padding: 0 !important;
                            }

                            .manual-print-sheet {
                                width: 196mm;
                                height: 283mm;
                                overflow: hidden;
                                box-shadow: none !important;
                                border: 0 !important;
                                padding: 0 !important;
                            }

                            .manual-print-grid {
                                gap: 2.2mm !important;
                            }

                            .manual-density-md .manual-print-grid {
                                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                            }

                            .manual-density-sm .manual-print-grid {
                                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                            }

                            .manual-density-xs .manual-print-grid {
                                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                            }

                            .manual-density-md .manual-recipe-name {
                                font-size: 8.5pt !important;
                            }

                            .manual-density-sm .manual-recipe-name {
                                font-size: 7.5pt !important;
                            }

                            .manual-density-xs .manual-recipe-name {
                                font-size: 6.6pt !important;
                            }

                            .manual-density-md .manual-recipe-text {
                                font-size: 7.3pt !important;
                                line-height: 1.23 !important;
                            }

                            .manual-density-sm .manual-recipe-text {
                                font-size: 6.5pt !important;
                                line-height: 1.18 !important;
                            }

                            .manual-density-xs .manual-recipe-text {
                                font-size: 5.7pt !important;
                                line-height: 1.12 !important;
                            }
                        }
                    `}</style>

                    <div className="manual-print-shell p-8">
                        <div className="flex justify-between items-center mb-6 print:hidden">
                            <div>
                                <h1 className="text-3xl font-bold text-brewasa-dark">Contekan Resep Manual</h1>
                                <p className="text-sm text-gray-500 mt-1">Mode ini hanya mencetak teks resep dan dipadatkan untuk 1 halaman A4.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="bg-brewasa-dark text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2"
                                >
                                    <Printer className="w-5 h-5" /> Cetak 1 Halaman
                                </button>
                                <button
                                    onClick={() => setIsPrinting(false)}
                                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-bold"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>

                        <section className={`manual-print-sheet ${manualDensityClass} bg-white mx-auto border border-gray-200 shadow-sm p-5`}>
                            <header className="border-b border-gray-300 pb-2 mb-3">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold">Brewasa</p>
                                        <h1 className="text-xl font-black text-brewasa-dark leading-tight">Contekan Resep Manual</h1>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-semibold">{manualPrintData.length} resep</p>
                                </div>
                            </header>

                            {manualPrintData.length === 0 ? (
                                <div className="h-[70vh] flex items-center justify-center text-gray-400 text-sm">
                                    Belum ada resep manual yang bisa dicetak.
                                </div>
                            ) : (
                                <div className="manual-print-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {manualPrintData.map((data, idx) => (
                                        <article key={`${data.menuName}-${idx}`} className="break-inside-avoid border border-gray-300 rounded-md p-2">
                                            <h2 className="manual-recipe-name text-xs font-black uppercase tracking-wide text-brewasa-dark border-b border-gray-200 pb-1 mb-1">
                                                {data.menuName}
                                            </h2>
                                            <div className="manual-recipe-text whitespace-pre-line text-[11px] leading-snug text-gray-800">
                                                {data.manualRecipe}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            );
        }

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
                            {data.manualRecipe.trim() && (
                                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">Langkah Manual</h3>
                                    <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{data.manualRecipe}</div>
                                </div>
                            )}
                            {data.items.length > 0 && (
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
                            )}
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
                                onClick={() => handlePrintRecipes('complete')}
                                className="text-sm bg-gray-100 hover:bg-gray-200 text-brewasa-dark px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                            >
                                <Printer className="w-4 h-4" /> Cetak Resep
                            </button>
                        )}
                        {!editingId && (
                            <button
                                onClick={() => handlePrintRecipes('manual')}
                                className="text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border border-emerald-100"
                            >
                                <ListOrdered className="w-4 h-4" /> Cetak Teks Resep
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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

                    {/* Consignment Section */}
                    <div className="md:col-span-2 bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isConsignment"
                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                checked={newItem.isConsignment}
                                onChange={e => setNewItem({ ...newItem, isConsignment: e.target.checked, consignmentCost: e.target.checked ? newItem.consignmentCost : '' })}
                            />
                            <label htmlFor="isConsignment" className="text-amber-800 font-medium cursor-pointer select-none flex items-center gap-1">
                                <Package className="w-4 h-4" /> Barang Titipan (Consignment)
                            </label>
                        </div>
                        {newItem.isConsignment && (
                            <div className="animate-fadeIn">
                                <label className="block text-sm font-bold text-amber-700 mb-1">Harga Modal dari Supplier (Rp)</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-mono"
                                    placeholder="Contoh: 5000"
                                    value={newItem.consignmentCost}
                                    onChange={e => setNewItem({ ...newItem, consignmentCost: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-amber-600 mt-1">Profit = Harga Jual − Harga Modal ini</p>
                            </div>
                        )}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
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
                                            <div className="flex gap-2 flex-wrap">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${item.category === 'ADDON' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                    {item.category || 'MAIN'}
                                                </span>
                                                {item.is_consignment && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-0.5">
                                                        <Package className="w-3 h-3" /> TITIPAN
                                                    </span>
                                                )}
                                                {(item.manual_recipe || item.manualRecipe) && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-0.5">
                                                        <ListOrdered className="w-3 h-3" /> RESEP
                                                    </span>
                                                )}
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
                    <div className="bg-white rounded-xl max-w-5xl w-full p-6 h-[82vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Resep: {selectedMenuForRecipe.name}</h3>
                            <button onClick={() => setRecipeModalOpen(false)}><X /></button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pr-1 lg:pr-0">
                            <div className="flex flex-col min-h-0">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <ListOrdered className="w-4 h-4 text-brewasa-copper" />
                                        Langkah Manual
                                    </h4>
                                    <button
                                        onClick={saveManualRecipe}
                                        disabled={savingManualRecipe}
                                        className="text-sm bg-brewasa-dark hover:bg-gray-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {savingManualRecipe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Simpan
                                    </button>
                                </div>
                                <textarea
                                    className="flex-1 min-h-[240px] lg:min-h-0 w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-sm leading-relaxed resize-none"
                                    placeholder={`1. Masukan espresso ke gelas\n2. Tambahkan susu dan gula aren\n3. Aduk sampai rata\n4. Sajikan dengan es batu`}
                                    value={manualRecipeText}
                                    onChange={e => setManualRecipeText(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-gray-500">Tulis bebas pakai nomor, bullet, atau catatan barista. Bagian ini tidak memengaruhi HPP dan stok.</p>
                            </div>

                            <div className="flex flex-col min-h-0">
                                <h4 className="font-bold text-sm mb-2">Bahan Baku untuk HPP/Stok</h4>
                                <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-2 min-h-[220px]">
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
                                            {recipeItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-6 text-sm text-center text-gray-400">Belum ada bahan baku.</td>
                                                </tr>
                                            )}
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
                                    <div className="flex flex-col sm:flex-row gap-2">
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
                                            className="w-full sm:w-20 p-2 border rounded text-sm"
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
                    </div>
                </div>
            )}
        </div>
    );
};


export default MenuManager;
