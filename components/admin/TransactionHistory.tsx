import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Search, Filter, Loader2, Calendar, User, ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Transaction {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    customer_name?: string;
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
            setTransactions(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert('Gagal update status: ' + error.message);
        } else {
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, status: newStatus } : t
            ));
        }
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

    const filtered = filterStatus === 'ALL'
        ? transactions
        : transactions.filter(t => t.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-brewasa-dark">Riwayat Transaksi</h2>
                <div className="flex gap-2">
                    {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${filterStatus === s
                                ? 'bg-brewasa-dark text-white border-brewasa-dark'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {s === 'ALL' ? 'Semua' : s}
                        </button>
                    ))}
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
                                    <th className="p-4 font-semibold text-gray-600">Items</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Metode</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Tidak ada data transaksi.</td></tr>
                                )}
                                {filtered.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono text-xs text-gray-400">#{t.id.slice(0, 8)}</div>
                                            <div className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.created_at).toLocaleDateString('id-ID')}
                                                <Clock className="w-3 h-3 ml-2" />
                                                {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brewasa-cream/50 flex items-center justify-center text-brewasa-dark font-bold text-xs border border-brewasa-cream">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-gray-800">{t.customer_name || 'Tanpa Nama'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4"> {/* NEW Column */}
                                            <span className="px-2 py-1 rounded text-xs font-bold border bg-blue-50 text-blue-600 border-blue-100">
                                                {t.order_type?.replace('_', ' ') || 'DINE IN'}
                                            </span>
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {/* @ts-ignore */}
                                                {t.transaction_items?.map((i, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                                        <span className="font-bold">{i.quantity}x</span> {i.item_name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-bold text-brewasa-dark">
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
