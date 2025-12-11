import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trash2, Plus, Image as ImageIcon, Loader2, Pencil, X } from 'lucide-react';
import { MenuItem } from '../../types';

// We extend MenuItem for local state but Supabase types might vary slightly
interface AdminMenuItem extends MenuItem {
    // Supabase returns these
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
        forWhat: ''
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching menu:', error);
        } else {
            setItems(data?.map((item: any) => ({
                ...item,
                forWhat: item.for_what
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
            forWhat: item.forWhat
        });
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
            forWhat: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const tagsArray = newItem.tags.split(',').map(t => t.trim());
        const payload = {
            name: newItem.name,
            description: newItem.description,
            price: newItem.price,
            image: newItem.image || 'https://picsum.photos/400/300',
            tags: tagsArray,
            for_what: newItem.forWhat
        };

        if (editingId) {
            // UPDATE
            const { error } = await supabase
                .from('menu_items')
                .update(payload)
                .eq('id', editingId);

            if (error) {
                alert('Gagal update menu: ' + error.message);
            } else {
                alert('Menu berhasil diupdate!');
                handleCancelEdit();
                fetchItems();
            }
        } else {
            // INSERT
            const { error } = await supabase
                .from('menu_items')
                .insert([payload]);

            if (error) {
                alert('Gagal menambah menu: ' + error.message);
            } else {
                alert('Menu berhasil ditambah!');
                handleCancelEdit();
                fetchItems();
            }
        }
        setSubmitting(false);
    };

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
                    {editingId && (
                        <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                            <X className="w-4 h-4" /> Batal Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        placeholder="Nama Menu (Contoh: Kopi Susu Senja)"
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        required
                    />
                    <input
                        placeholder="Harga (Contoh: 25k)"
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.price}
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                        required
                    />
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
                    <input
                        placeholder="Image URL (Biarkan kosong untuk random)"
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.image}
                        onChange={e => setNewItem({ ...newItem, image: e.target.value })}
                    />
                    <textarea
                        placeholder="Untuk Apa? (Filosofi/Alasan Emotional)"
                        className="p-3 border rounded-lg md:col-span-2 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                        value={newItem.forWhat}
                        onChange={e => setNewItem({ ...newItem, forWhat: e.target.value })}
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`text-white p-3 rounded-lg font-bold md:col-span-2 transition-colors disabled:opacity-50 ${editingId ? 'bg-brewasa-copper hover:bg-orange-600' : 'bg-brewasa-dark hover:bg-gray-800'}`}
                    >
                        {submitting ? 'Menyimpan...' : (editingId ? 'Update Menu' : 'Simpan Menu')}
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
        </div>
    );
};

export default MenuManager;
