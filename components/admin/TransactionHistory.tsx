import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Search, Filter, Loader2, Calendar, User, ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle, Download, TrendingUp, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Transaction {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    customer_name?: string;
    order_type?: string;
    items?: TransactionItem[];
}

interface TransactionItem {
    id: string;
    item_name: string;
    quantity: number;
    price: number;
}

const TransactionHistory: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDate, setFilterDate] = useState({ start: '', end: '' }); // NEW
    const [stats, setStats] = useState({ daily: 0, weekly: 0, monthly: 0 });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        // Supabase join syntax for one-to-many is a bit tricky with typing, 
        // sometimes easier to just fetch transactions and then fetch items or use a view.
        // For now let's query transactions and we can expand if needed.
        // Actually, let's just fetch transactions for the list, detail maybe later or expanded row.

        let query = supabase
            .from('transactions')
            .select(`
                *,
                order_type,
                transaction_items (
                    id, item_name, quantity, price
                )
            `)
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching transactions:', error);
        } else {
            // @ts-ignore
            const trans: Transaction[] = data || [];
            setTransactions(trans);
            calculateStats(trans);
        }
        setLoading(false);
    };

    const calculateStats = (data: Transaction[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let daily = 0;
        let weekly = 0;
        let monthly = 0;

        data.forEach(t => {
            // Only count completed transactions for revenue
            if (t.status !== 'COMPLETED') return;

            const tDate = new Date(t.created_at);

            // Daily
            if (tDate >= today) daily += t.total_amount;

            // Weekly
            if (tDate >= startOfWeek) weekly += t.total_amount;

            // Monthly
            if (tDate >= startOfMonth) monthly += t.total_amount;
        });

        setStats({ daily, weekly, monthly });
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert('Gagal update status: ' + error.message);
        } else {
            const updated = transactions.map(t =>
                t.id === id ? { ...t, status: newStatus } : t
            );
            setTransactions(updated);
            calculateStats(updated); // Recalculate stats as status might have changed to/from COMPLETED
        }
    };

    const exportToExcel = () => {
        const dataToExport = filtered.map(t => ({
            ID: t.id,
            Date: new Date(t.created_at).toLocaleDateString(),
            Time: new Date(t.created_at).toLocaleTimeString(),
            Customer: t.customer_name || 'Anonymous',
            Type: t.order_type || 'N/A',
            Items: t.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', '),
            Total: t.total_amount,
            Method: t.payment_method,
            Status: t.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `Brewasa_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filtered = transactions.filter(t => {
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

        // Date Filtering
        let matchesDate = true;
        if (filterDate.start) {
            const start = new Date(filterDate.start);
            const tDate = new Date(t.created_at);
            // Reset time for comparison
            start.setHours(0, 0, 0, 0);
            const tDateOnly = new Date(tDate);
            tDateOnly.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && tDateOnly >= start;
        }
        if (filterDate.end) {
            const end = new Date(filterDate.end);
            const tDate = new Date(t.created_at);
            end.setHours(23, 59, 59, 999);
            const tDateOnly = new Date(tDate);
            // We compare full date vs end of filtered day
            matchesDate = matchesDate && tDate <= end;
        }

        return matchesStatus && matchesDate;
    });

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Penjualan Hari Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.daily.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Minggu Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.weekly.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Bulan Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.monthly.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-brewasa-dark">Riwayat Transaksi</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        {/* Status Filter */}
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto self-start">
                            {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filterStatus === s
                                            ? 'bg-brewasa-dark text-white'
                                            : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {s === 'ALL' ? 'Semua' : s}
                                </button>
                            ))}
                        </div>

                        {/* Date Filter */}
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                                value={filterDate.start}
                                onChange={e => setFilterDate(prev => ({ ...prev, start: e.target.value }))}
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                                value={filterDate.end}
                                onChange={e => setFilterDate(prev => ({ ...prev, end: e.target.value }))}
                            />
                            {(filterDate.start || filterDate.end) && (
                                <button
                                    onClick={() => setFilterDate({ start: '', end: '' })}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Reset Date"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin text-brewasa-copper" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">ID & Waktu</th>
                                    <th className="p-4 font-semibold text-gray-600">Customer</th>
                                    <th className="p-4 font-semibold text-gray-600">Type</th>
                                    <th className="p-4 font-semibold text-gray-600">Items</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Metode</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Tidak ada data transaksi.</td></tr>
                                )}
                                {filtered.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono text-xs text-gray-400">#{t.id.slice(0, 8)}</div>
                                            <div className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.created_at).toLocaleDateString('id-ID')}
                                                <div className="hidden sm:flex items-center gap-1">
                                                    <Clock className="w-3 h-3 ml-2" />
                                                    {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brewasa-cream/50 flex items-center justify-center text-brewasa-dark font-bold text-xs border border-brewasa-cream shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-gray-800 line-clamp-1">{t.customer_name || 'Tanpa Nama'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs font-bold border bg-blue-50 text-blue-600 border-blue-100 whitespace-nowrap">
                                                {t.order_type?.replace('_', ' ') || 'DINE IN'}
                                            </span>
                                        </td>
                                        <td className="p-4 max-w-xs min-w-[200px]">
                                            <div className="flex flex-wrap gap-1">
                                                {/* @ts-ignore */}
                                                {t.transaction_items?.map((i, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                                        <span className="font-bold">{i.quantity}x</span> {i.item_name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-bold text-brewasa-dark whitespace-nowrap">
                                            Rp {t.total_amount.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 rounded text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
                                                {t.payment_method}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getStatusColor(t.status)}`}>
                                                    {t.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                                                    {t.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                                                    {t.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                                                    {t.status}
                                                </div>
                                                <select
                                                    value={t.status}
                                                    onChange={(e) => updateStatus(t.id, e.target.value)}
                                                    className="text-xs border rounded px-1 py-0.5 bg-white hover:border-brewasa-copper cursor-pointer outline-none"
                                                >
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="PROCESSING">PROCESSING</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
