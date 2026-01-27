import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { FileDown, Loader2, Database, Receipt, Coffee, Activity } from 'lucide-react';

const ExportManager: React.FC = () => {
    const [loading, setLoading] = useState(false);

    // Helper to download CSV
    const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("Tidak ada data untuk diexport");
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(fieldName => {
                const value = row[fieldName];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"` // Quote strings with commas
                    : value;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportStock = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('ingredients').select('name, unit, current_stock, min_stock, price_per_unit, purchase_unit, conversion_ratio');

        if (error) {
            alert('Error fetching stock: ' + error.message);
        } else {
            const formatted = data.map(item => ({
                Nama_Bahan: item.name,
                Satuan: item.unit,
                Stok_Saat_Ini: item.current_stock,
                Minimum_Stok: item.min_stock,
                Harga_Per_Unit: item.price_per_unit,
                Nilai_Aset_Estimasi: item.current_stock * item.price_per_unit,
                Satuan_Beli: item.purchase_unit || '-',
                Rasio_Konversi: item.conversion_ratio || 1
            }));
            downloadCSV(formatted, `Laporan_Stok_Bahan_${new Date().toISOString().split('T')[0]}.csv`);
        }
        setLoading(false);
    };

    const handleExportLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('stock_logs')
            .select(`
                *,
                ingredients (name, unit)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            alert('Error fetching logs: ' + error.message);
        } else {
            const formatted = data.map((log: any) => ({
                Tanggal: new Date(log.created_at).toLocaleString('id-ID'),
                Nama_Bahan: log.ingredients?.name || 'Unknown',
                Perubahan: log.change_amount,
                Satuan: log.ingredients?.unit || '',
                Alasan: log.reason,
                Catatan: log.notes || '-'
            }));
            downloadCSV(formatted, `Riwayat_Stok_Log_${new Date().toISOString().split('T')[0]}.csv`);
        }
        setLoading(false);
    };

    const handleExportOverhead = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('overhead_costs').select('*');
        if (error) {
            alert('Error: ' + error.message);
        } else {
            downloadCSV(data, `Data_Overhead_${new Date().toISOString().split('T')[0]}.csv`);
        }
        setLoading(false);
    };

    const handleExportMenuAnalysis = async () => {
        setLoading(true);
        // fetch menu, ingredients, recipes, overheads to calculate HPP
        try {
            const [menus, recipes, overheads] = await Promise.all([
                supabase.from('menu_items').select('*'),
                supabase.from('menu_recipes').select('*, ingredients(price_per_unit)'),
                supabase.from('overhead_costs').select('*')
            ]);

            if (!menus.data || !recipes.data || !overheads.data) throw new Error("Gagal mengambil data");

            // Calculate Overhead Total
            const totalFixed = overheads.data.filter((o: any) => o.type === 'fixed').reduce((sum: number, o: any) => sum + o.amount, 0);
            const totalVariable = overheads.data.filter((o: any) => o.type === 'variable').reduce((sum: number, o: any) => sum + o.amount, 0);
            const estSales = 1000; // Default assumption for simple export, or could use input. Keeping it raw data focused.
            const overheadPerUnit = (totalFixed + totalVariable) / estSales;

            const analysis = menus.data.map((menu: any) => {
                // Calculate HPP
                const menuRecipes = recipes.data.filter((r: any) => r.menu_item_id === menu.id);
                const rawHpp = menuRecipes.reduce((sum: number, r: any) => {
                    const price = r.ingredients?.price_per_unit || 0;
                    return sum + (price * r.quantity_required);
                }, 0);

                const priceNum = parseInt(menu.price.replace(/\D/g, '')) || 0;

                return {
                    Nama_Menu: menu.name,
                    Kategori: menu.category,
                    Harga_Jual: priceNum,
                    HPP_Bahan: Math.round(rawHpp),
                    Estimasi_Overhead_Unit: Math.round(overheadPerUnit),
                    Total_HPP: Math.round(rawHpp + overheadPerUnit),
                    Gross_Margin: priceNum - Math.round(rawHpp),
                    Net_Margin_Est: priceNum - Math.round(rawHpp + overheadPerUnit)
                };
            });

            downloadCSV(analysis, `Analisa_Menu_HPP_${new Date().toISOString().split('T')[0]}.csv`);

        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                <FileDown className="w-6 h-6" /> Export Data & Laporan
            </h2>
            <p className="text-gray-600">Download data dalam format CSV untuk analisa lebih lanjut di Excel/Spreadsheet.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inventory Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Database className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Laporan Inventory</h3>
                    <p className="text-sm text-gray-500 mb-6">Data stok saat ini, nilai aset bahan baku, dan satuan konversi.</p>
                    <button
                        onClick={handleExportStock}
                        disabled={loading}
                        className="w-full py-2 bg-white border border-blue-200 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        Download Data Stok
                    </button>
                </div>

                {/* Logs Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Riwayat Log Stok</h3>
                    <p className="text-sm text-gray-500 mb-6">Catatan keluar masuk barang, alasan (waste/salah/jual), dan waktu.</p>
                    <button
                        onClick={handleExportLogs}
                        disabled={loading}
                        className="w-full py-2 bg-white border border-orange-200 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        Download Log Stok
                    </button>
                </div>

                {/* Menu Analysis Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <Coffee className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Analisa Harga & HPP</h3>
                    <p className="text-sm text-gray-500 mb-6">Export perhitungan HPP, Margin Kotor, dan Estimasi Profit per Menu.</p>
                    <button
                        onClick={handleExportMenuAnalysis}
                        disabled={loading}
                        className="w-full py-2 bg-white border border-green-200 text-green-600 rounded-lg font-medium hover:bg-green-50 transition flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        Download Analisa Menu
                    </button>
                </div>

                {/* Overhead Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <Receipt className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Data Overhead</h3>
                    <p className="text-sm text-gray-500 mb-6">Daftar biaya operasional tetap dan variabel bulanan.</p>
                    <button
                        onClick={handleExportOverhead}
                        disabled={loading}
                        className="w-full py-2 bg-white border border-purple-200 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        Download Overhead
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportManager;
