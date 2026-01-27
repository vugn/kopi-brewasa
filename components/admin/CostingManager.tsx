import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Plus, Trash2, Calculator, TrendingUp, DollarSign } from 'lucide-react';

interface Overhead {
    id: string;
    name: string;
    amount: number;
    type: 'fixed' | 'variable';
    period: 'monthly' | 'daily';
}

interface MenuItem {
    id: string;
    name: string;
    price: string; // "25k"
    image: string;
}

interface RecipeItem {
    ingredient_name: string;
    quantity: number;
    cost_per_unit: number;
}

const CostingManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overhead' | 'calculator'>('calculator');
    const [overheads, setOverheads] = useState<Overhead[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [salesEstimate, setSalesEstimate] = useState<number>(1000); // Default estimate 1000 cups/month
    const [loading, setLoading] = useState(true);

    // HPP Calculation Map
    const [hppMap, setHppMap] = useState<Record<string, number>>({});

    // Overhead Form
    const [newOverhead, setNewOverhead] = useState<Partial<Overhead>>({
        name: '', amount: 0, type: 'fixed', period: 'monthly'
    });

    // Asset Depreciation Helper
    const [isAssetMode, setIsAssetMode] = useState(false);
    const [assetData, setAssetData] = useState({ price: 0, months: 12 });

    useEffect(() => {
        if (isAssetMode) {
            const monthlyDepreciation = assetData.months > 0 ? assetData.price / assetData.months : 0;
            setNewOverhead(prev => ({
                ...prev,
                amount: Math.round(monthlyDepreciation)
            }));
        }
    }, [assetData, isAssetMode]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchOverheads(), fetchMenuAndRecipes()]);
        setLoading(false);
    };

    const fetchOverheads = async () => {
        const { data } = await supabase.from('overhead_costs').select('*');
        if (data) setOverheads(data);
    };

    const fetchMenuAndRecipes = async () => {
        // 1. Fetch Menu Items
        const { data: menuData } = await supabase.from('menu_items').select('*');
        if (!menuData) return;
        setMenuItems(menuData);

        // 2. Fetch Recipes & Ingredients to calculate HPP
        // This is a bit complex in one query, so we might need to do a join or separate fetches.
        // Let's fetch all recipes and ingredients then calculate in JS
        const { data: recipeData } = await supabase.from('menu_recipes').select('*, ingredients(*)');

        if (recipeData) {
            const newHppMap: Record<string, number> = {};

            menuData.forEach((menu: any) => {
                const menuRecipes = recipeData.filter((r: any) => r.menu_item_id == menu.id);
                let totalCost = 0;
                menuRecipes.forEach((r: any) => {
                    const ing = r.ingredients;
                    if (ing) {
                        totalCost += (r.quantity_required * ing.price_per_unit);
                    }
                });
                newHppMap[menu.id] = totalCost;
            });
            setHppMap(newHppMap);
        }
    };

    const handleAddOverhead = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('overhead_costs').insert([newOverhead]);
        if (!error) {
            fetchOverheads();
            setNewOverhead({ name: '', amount: 0, type: 'fixed', period: 'monthly' });
        }
    };

    const handleDeleteOverhead = async (id: string) => {
        await supabase.from('overhead_costs').delete().eq('id', id);
        fetchOverheads();
    };

    // Calculate Financials
    const totalFixedCost = overheads.filter(o => o.type === 'fixed').reduce((acc, curr) => {
        return acc + (curr.period === 'daily' ? curr.amount * 30 : curr.amount);
    }, 0);

    const overheadPerUnit = totalFixedCost / (salesEstimate || 1);

    const parsePrice = (priceStr: string) => {
        if (!priceStr) return 0;
        // Handle "25k" -> 25000, "25.000" -> 25000
        let p = priceStr.toLowerCase().replace('k', '000').replace('.', '').replace(',', '');
        return parseFloat(p) || 0;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                <Calculator className="w-6 h-6" /> Costing & Profit Analysis
            </h2>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('calculator')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'calculator' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Profit Calculator (HPP)
                </button>
                <button
                    onClick={() => setActiveTab('overhead')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'overhead' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Overhead Settings
                </button>
            </div>

            {activeTab === 'overhead' && (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                        <h3 className="font-bold mb-4">Tambah Biaya Operasional</h3>
                        <form onSubmit={handleAddOverhead} className="space-y-4">
                            <input
                                placeholder="Nama Biaya (Sewa, Gaji, Listrik)"
                                className="w-full p-2 border rounded"
                                value={newOverhead.name}
                                onChange={e => setNewOverhead({ ...newOverhead, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number" placeholder="Jumlah (Rp)"
                                    className="w-full p-2 border rounded"
                                    value={newOverhead.amount || ''}
                                    onChange={e => setNewOverhead({ ...newOverhead, amount: parseFloat(e.target.value) })}
                                    required
                                />
                                <select
                                    className="p-2 border rounded"
                                    value={newOverhead.period}
                                    onChange={e => setNewOverhead({ ...newOverhead, period: e.target.value as any })}
                                >
                                    <option value="monthly">Per Bulan</option>
                                    <option value="daily">Per Hari</option>
                                </select>
                            </div>
                            <select
                                className="w-full p-2 border rounded"
                                value={newOverhead.type}
                                onChange={e => setNewOverhead({ ...newOverhead, type: e.target.value as any })}
                            >
                                <option value="fixed">Fixed Cost (Tetap)</option>
                                <option value="variable">Variable Cost (Berubah)</option>
                            </select>

                            {/* Asset Depreciation Helper Toggle */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <label className="flex items-center gap-2 text-sm text-blue-800 font-medium mb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAssetMode}
                                        onChange={e => setIsAssetMode(e.target.checked)}
                                        className="rounded text-brewasa-dark"
                                    />
                                    Hitung Penyusutan Aset (Furniture/Alat)
                                </label>

                                {isAssetMode && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                                        <div>
                                            <label className="text-xs text-blue-600 block mb-1">Harga Beli Aset</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded text-sm"
                                                value={assetData.price}
                                                onChange={e => setAssetData({ ...assetData, price: parseFloat(e.target.value) })}
                                                placeholder="Contoh: 12000000"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-blue-600 block mb-1">Masa Pakai (Bulan)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded text-sm"
                                                value={assetData.months}
                                                onChange={e => setAssetData({ ...assetData, months: parseFloat(e.target.value) })}
                                                placeholder="Contoh: 60 (5 tahun)"
                                            />
                                        </div>
                                        <div className="col-span-2 text-xs text-blue-500 italic mt-1">
                                            *Biaya per bulan otomatis dihitung: Rp {Math.round(assetData.months > 0 ? assetData.price / assetData.months : 0).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-brewasa-dark text-white p-2 rounded hover:bg-brewasa-copper">Simpan</button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">Daftar Biaya Overhead</h3>
                                    <p className="text-sm text-gray-500">Total Fixed Cost Bulanan: <span className="font-bold text-black">Rp {totalFixedCost.toLocaleString()}</span></p>
                                </div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="p-3">Nama</th>
                                        <th className="p-3">Tipe</th>
                                        <th className="p-3">Jumlah</th>
                                        <th className="p-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {overheads.map(o => (
                                        <tr key={o.id}>
                                            <td className="p-3 font-medium">{o.name}</td>
                                            <td className="p-3 capitalize">
                                                <span className={`px-2 py-1 rounded-full text-xs ${o.type === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {o.type}
                                                </span>
                                            </td>
                                            <td className="p-3">Rp {o.amount.toLocaleString()} <span className="text-gray-400 text-xs">/{o.period === 'monthly' ? 'bln' : 'hari'}</span></td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeleteOverhead(o.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'calculator' && (
                <div className="space-y-6">
                    {/* Controls */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Estimasi Penjualan per Bulan (Cup/Porsi)</label>
                            <input
                                type="number"
                                value={salesEstimate}
                                onChange={e => setSalesEstimate(parseFloat(e.target.value))}
                                className="text-2xl font-bold p-2 border-b-2 border-brewasa-copper focus:outline-none bg-transparent w-full"
                            />
                            <p className="text-sm text-gray-500 mt-1">Digunakan untuk membagi biaya overhead ke per unit produk.</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg min-w-[200px]">
                            <p className="text-sm text-gray-500">Overhead Cost / Unit</p>
                            <p className="text-xl font-bold text-brewasa-dark">Rp {Math.round(overheadPerUnit).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Product Analysis Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-gray-900 text-white">
                                <tr>
                                    <th className="p-4">Menu Item</th>
                                    <th className="p-4 text-right">Harga Jual</th>
                                    <th className="p-4 text-right">HPP Bahan</th>
                                    <th className="p-4 text-right">HPP + Overhead</th>
                                    <th className="p-4 text-right">Margin (Profit)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {menuItems.map(item => {
                                    const hppBahan = hppMap[item.id] || 0;
                                    const totalHpp = hppBahan + overheadPerUnit;
                                    const sellingPrice = parsePrice(item.price);
                                    const margin = sellingPrice - totalHpp;
                                    const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4 flex items-center gap-3">
                                                <img src={item.image} className="w-10 h-10 rounded object-cover bg-gray-200" alt="" />
                                                <span className="font-medium">{item.name}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono">Rp {sellingPrice.toLocaleString()}</td>
                                            <td className="p-4 text-right">Rp {Math.round(hppBahan).toLocaleString()}</td>
                                            <td className="p-4 text-right">Rp {Math.round(totalHpp).toLocaleString()}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-bold ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        Rp {Math.round(margin).toLocaleString()}
                                                    </span>
                                                    <span className={`text-xs ${marginPercent > 30 ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {Math.round(marginPercent)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostingManager;
