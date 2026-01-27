import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Plus, Trash2, History, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    price_per_unit: number;
    current_stock: number;
    min_stock: number;
    purchase_unit?: string;
    conversion_ratio?: number;
}

interface StockLog {
    id: string;
    change_amount: number;
    reason: string;
    created_at: string;
    notes: string;
    ingredient_name: string;
}

const InventoryManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ingredients' | 'logs'>('ingredients');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
        name: '', unit: 'gram', price_per_unit: 0, current_stock: 0, min_stock: 0,
        purchase_unit: '', conversion_ratio: 1
    });

    // Helper for Price Calculation
    const [purchasePrice, setPurchasePrice] = useState<number>(0);

    const handlePurchasePriceChange = (price: number) => {
        setPurchasePrice(price);
        const ratio = newIngredient.conversion_ratio || 1;
        setNewIngredient(prev => ({
            ...prev,
            price_per_unit: price / ratio
        }));
    };

    const handleRatioChange = (ratio: number) => {
        setNewIngredient(prev => ({
            ...prev,
            conversion_ratio: ratio,
            price_per_unit: purchasePrice / (ratio || 1)
        }));
    };

    // Stock Movement State
    const [stockMovement, setStockMovement] = useState({
        amount: '',
        type: 'in', // in, out, opname
        reason_detail: 'usage', // Specific reason for 'out'
        notes: ''
    });

    useEffect(() => {
        if (activeTab === 'ingredients') fetchIngredients();
        else fetchLogs();
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoading(true);
        // Join with ingredients to get name if needed, but for now assuming we might store it or fetch separately
        // Actually stock_logs has ingredient_id. Standard supabase select with relation:
        const { data, error } = await supabase
            .from('stock_logs')
            .select(`
                *,
                ingredients (name, unit)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error(error);
        else {
            setLogs(data?.map((log: any) => ({
                ...log,
                ingredient_name: log.ingredients?.name || 'Unknown',
                unit: log.ingredients?.unit || ''
            })) || []);
        }
        setLoading(false);
    };

    const fetchIngredients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('name');

        if (error) console.error(error);
        else setIngredients(data || []);
        setLoading(false);
    };

    const handleSubmitIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedIngredient) {
                // Update
                const { error } = await supabase
                    .from('ingredients')
                    .update(newIngredient)
                    .eq('id', selectedIngredient.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('ingredients')
                    .insert([newIngredient]);
                if (error) throw error;
            }
            setIsFormOpen(false);
            fetchIngredients();
            resetForm();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus bahan baku ini?')) return;
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (error) alert('Gagal hapus');
        else fetchIngredients();
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIngredient) return;

        const amount = parseFloat(stockMovement.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Jumlah tidak valid');
            return;
        }

        try {
            let change = amount;
            let current = selectedIngredient.current_stock;
            let reason = 'purchase';

            if (stockMovement.type === 'out') {
                change = -amount;
                reason = stockMovement.reason_detail; // Use specific reason
            } else if (stockMovement.type === 'opname') {
                change = amount - current; // difference
                reason = 'opname';
            } else if (stockMovement.type === 'in' && selectedIngredient.conversion_ratio && selectedIngredient.conversion_ratio > 1) {
                // Handle Stock In with Purchase Unit
                const isBuyingInPurchaseUnit = true; // Could rely on UI toggle, but let's assume 'in' is purchase
                if (isBuyingInPurchaseUnit) {
                    change = amount * selectedIngredient.conversion_ratio;
                }
            }

            // 1. Update Ingredient Stock
            const { error: updateError } = await supabase
                .from('ingredients')
                .update({
                    current_stock: stockMovement.type === 'opname' ? amount : current + change
                })
                .eq('id', selectedIngredient.id);

            if (updateError) throw updateError;

            // 2. Insert Log
            const { error: logError } = await supabase
                .from('stock_logs')
                .insert([{
                    ingredient_id: selectedIngredient.id,
                    change_amount: change,
                    reason: reason,
                    notes: stockMovement.notes
                }]);

            if (logError) throw logError;

            setIsStockModalOpen(false);
            fetchIngredients();
            setIsStockModalOpen(false);
            fetchIngredients();
            setStockMovement({ amount: '', type: 'in', reason_detail: 'usage', notes: '' });

        } catch (error: any) {
            alert('Error updating stock: ' + error.message);
        }
    };

    const resetForm = () => {
        setSelectedIngredient(null);
        setNewIngredient({ name: '', unit: 'gram', price_per_unit: 0, current_stock: 0, min_stock: 0, purchase_unit: '', conversion_ratio: 1 });
        setPurchasePrice(0);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <h2 className="text-2xl font-bold text-brewasa-dark">Inventory & Stock</h2>
                    <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                        <button
                            onClick={() => setActiveTab('ingredients')}
                            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'ingredients' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Stok Bahan
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'logs' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Riwayat Log
                        </button>
                    </div>
                </div>

                {activeTab === 'ingredients' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => { resetForm(); setIsFormOpen(true); }}
                            className="bg-brewasa-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brewasa-copper transition"
                        >
                            <Plus className="w-4 h-4" /> Bahan Baru
                        </button>
                    </div>
                )}
            </div>

            {/* Content Switch */}
            {activeTab === 'ingredients' ? (
                /* List Ingredients */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Nama Bahan</th>
                                <th className="p-4 font-semibold text-gray-600">Stok Saat Ini</th>
                                <th className="p-4 font-semibold text-gray-600">Harga/Unit</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>}
                            {!loading && ingredients.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Belum ada data bahan baku.</td></tr>}

                            {ingredients.map(ing => (
                                <tr key={ing.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 font-medium text-brewasa-dark">
                                        {ing.name}
                                        {ing.current_stock <= ing.min_stock && (
                                            <span className="ml-2 inline-flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {ing.current_stock} <span className="text-gray-400 text-sm">{ing.unit}</span>
                                    </td>
                                    <td className="p-4 text-sm">
                                        Rp {ing.price_per_unit.toLocaleString()} / {ing.unit}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => { setSelectedIngredient(ing); setIsStockModalOpen(true); }}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-sm font-medium"
                                            title="Atur Stok"
                                        >
                                            Stok
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedIngredient(ing);
                                                setNewIngredient(ing);
                                                setPurchasePrice(ing.price_per_unit * (ing.conversion_ratio || 1));
                                                setIsFormOpen(true);
                                            }}
                                            className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg"
                                            title="Edit"
                                        >
                                            <div className="flex items-center gap-1">
                                                Edit
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ing.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Logs Tab */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Waktu</th>
                                <th className="p-4 font-semibold text-gray-600">Bahan</th>
                                <th className="p-4 font-semibold text-gray-600">Perubahan</th>
                                <th className="p-4 font-semibold text-gray-600">Alasan</th>
                                <th className="p-4 font-semibold text-gray-600">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>}
                            {!loading && logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada riwayat stok.</td></tr>}

                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-4 font-medium">
                                        {log.ingredient_name}
                                    </td>
                                    <td className={`p-4 font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full border ${log.reason === 'sale' ? 'bg-green-50 border-green-100 text-green-700' :
                                                log.reason === 'waste' ? 'bg-red-50 border-red-100 text-red-700' :
                                                    'bg-gray-50 border-gray-100 text-gray-600'
                                            }`}>
                                            {log.reason === 'sale' ? 'Penjualan' :
                                                log.reason === 'purchase' ? 'Pembelian' :
                                                    log.reason === 'waste' ? 'Terbuang' :
                                                        log.reason === 'usage' ? 'Pemakaian' :
                                                            log.reason === 'rnd' ? 'R&D / Test' :
                                                                log.reason === 'employee' ? 'Konsumsi Karyawan' :
                                                                    log.reason}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={log.notes}>
                                        {log.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Form Add/Edit */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">{selectedIngredient ? 'Edit Bahan' : 'Tambah Bahan Baru'}</h3>
                        <form onSubmit={handleSubmitIngredient} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nama Bahan</label>
                                <input type="text" required className="w-full p-2 border rounded"
                                    value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Satuan</label>
                                    <select className="w-full p-2 border rounded"
                                        value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}>
                                        <option value="gram">Gram (gr)</option>
                                        <option value="ml">Milliliter (ml)</option>
                                        <option value="pcs">Pcs</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="liter">Liter (L)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Min. Stok</label>
                                    <input type="number" className="w-full p-2 border rounded"
                                        value={newIngredient.min_stock} onChange={e => setNewIngredient({ ...newIngredient, min_stock: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Harga per Satuan (Estimasi)</label>
                                <input type="number" required className="w-full p-2 border rounded"
                                    value={newIngredient.price_per_unit} onChange={e => setNewIngredient({ ...newIngredient, price_per_unit: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Stok Awal (dalam {newIngredient.unit})</label>
                                <input type="number" required className="w-full p-2 border rounded"
                                    value={newIngredient.current_stock} onChange={e => setNewIngredient({ ...newIngredient, current_stock: parseFloat(e.target.value) })} />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-sm text-blue-800 mb-2">Konversi Satuan Beli (Opsional)</h4>
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-blue-600">Satuan Beli (ex: Kaleng)</label>
                                        <input type="text" className="w-full p-2 border rounded text-sm"
                                            placeholder="Contoh: Kaleng"
                                            value={newIngredient.purchase_unit || ''}
                                            onChange={e => setNewIngredient({ ...newIngredient, purchase_unit: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-blue-600">Isi per Satuan Beli (ex: 370)</label>
                                        <input type="number" className="w-full p-2 border rounded text-sm"
                                            value={newIngredient.conversion_ratio}
                                            onChange={e => handleRatioChange(parseFloat(e.target.value))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-blue-600">Harga Beli per Satuan Beli</label>
                                    <input type="number" className="w-full p-2 border rounded text-sm"
                                        value={purchasePrice}
                                        onChange={e => handlePurchasePriceChange(parseFloat(e.target.value))}
                                        placeholder="Contoh: 12000 (Harga 1 Kaleng)" />
                                </div>
                                <div className="mt-2 text-xs text-blue-500 italic">
                                    *Harga per {newIngredient.unit} otomatis: Rp {newIngredient.price_per_unit?.toFixed(2)}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-brewasa-dark text-white rounded hover:bg-brewasa-copper">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Stock Movement */}
            {isStockModalOpen && selectedIngredient && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-xl font-bold mb-2">Update Stok</h3>
                        <p className="text-sm text-gray-500 mb-4">Update stok untuk: <span className="font-bold text-black">{selectedIngredient.name}</span></p>

                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            {(['in', 'out', 'opname'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setStockMovement({ ...stockMovement, type })}
                                    className={`flex-1 py-1 text-sm font-medium rounded-md capitalize ${stockMovement.type === type ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                                >
                                    {type === 'in' ? 'Masuk' : type === 'out' ? 'Keluar' : 'Opname'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleStockSubmit} className="space-y-4">
                            <div>
                                {stockMovement.type === 'out' && (
                                    <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                        <label className="block text-xs font-bold text-orange-800 mb-1">Alasan Pengurangan</label>
                                        <select
                                            className="w-full p-2 border rounded text-sm bg-white"
                                            value={stockMovement.reason_detail}
                                            onChange={e => setStockMovement({ ...stockMovement, reason_detail: e.target.value })}
                                        >
                                            <option value="usage">Pemakaian Biasa (Manual)</option>
                                            <option value="waste">Terbuang / Rusak / Tumpah</option>
                                            <option value="rnd">R&D / Coba Resep</option>
                                            <option value="employee">Konsumsi Karyawan</option>
                                            <option value="other">Lainnya</option>
                                        </select>
                                    </div>
                                )}
                                <label className="block text-sm font-medium mb-1">
                                    {stockMovement.type === 'opname' ? 'Stok Aktual Sekarang' : 'Jumlah'}
                                    <span className="text-gray-400 font-normal ml-1">
                                        ({stockMovement.type === 'in' && selectedIngredient.purchase_unit ? selectedIngredient.purchase_unit : selectedIngredient.unit})
                                    </span>
                                </label>
                                {stockMovement.type === 'in' && selectedIngredient.purchase_unit && (
                                    <p className="text-xs text-blue-500 mb-1">
                                        *Input dalam {selectedIngredient.purchase_unit}. Otomatis dikonversi ke {selectedIngredient.unit} (x{selectedIngredient.conversion_ratio}).
                                    </p>
                                )}
                                <input
                                    type="number"
                                    required
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brewasa-copper"
                                    value={stockMovement.amount}
                                    onChange={e => setStockMovement({ ...stockMovement, amount: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Catatan</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    placeholder={stockMovement.type === 'in' ? 'Pembelian dari...' : 'Keterangan...'}
                                    value={stockMovement.notes}
                                    onChange={e => setStockMovement({ ...stockMovement, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-brewasa-dark text-white rounded hover:bg-brewasa-copper">Update Stok</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManager;
