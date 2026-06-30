import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trophy, Medal, Star, Calendar, Loader2, ArrowRight } from 'lucide-react';

interface Transaction {
    id: string;
    created_at: string;
    total_amount: number;
    customer_name: string;
    status: string;
}

interface CustomerStats {
    name: string;
    totalSpent: number;
    visitCount: number;
    lastVisit: string;
}

const TopSpenders: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'ALL' | 'THIS_MONTH'>('ALL');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        // We only care about completed transactions that have a customer name
        const { data, error } = await supabase
            .from('transactions')
            .select('id, created_at, total_amount, customer_name, status')
            .in('status', ['COMPLETED', 'PENDING'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transactions for top spenders:', error);
            alert('Gagal memuat data: ' + error.message);
        } else {
            setTransactions(data as Transaction[] || []);
        }
        setLoading(false);
    };

    const topSpenders = useMemo(() => {
        const statsMap = new Map<string, CustomerStats>();

        // Optional Time Filtering
        let filteredTransactions = transactions;
        if (timeFilter === 'THIS_MONTH') {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            filteredTransactions = transactions.filter(t => new Date(t.created_at).getTime() >= startOfMonth);
        }

        filteredTransactions.forEach(t => {
            // Normalize name to avoid 'budi' vs 'Budi' causing duplicates
            const rawName = t.customer_name?.trim();
            if (!rawName || rawName.toLowerCase() === 'guest' || rawName.toLowerCase() === 'tanpa nama') return;
            
            const nameKey = rawName.toLowerCase();

            if (!statsMap.has(nameKey)) {
                statsMap.set(nameKey, {
                    name: rawName, // Keep original case for display
                    totalSpent: 0,
                    visitCount: 0,
                    lastVisit: t.created_at
                });
            }

            const stats = statsMap.get(nameKey)!;
            stats.totalSpent += t.total_amount;
            stats.visitCount += 1;
            
            // Assuming transactions are already ordered desc by date, the first one encountered is the latest visit
            if (new Date(t.created_at) > new Date(stats.lastVisit)) {
                stats.lastVisit = t.created_at;
            }
        });

        // Convert to array and sort by total spent descending
        return Array.from(statsMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    }, [transactions, timeFilter]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-brewasa-copper" />
                <p className="text-gray-500 font-medium">Memuat Leaderboard Pelanggan...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-brewasa-dark flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-yellow-500" /> Pelanggan Setia (Top Spender)
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Daftar pelanggan loyal dengan pembelanjaan tertinggi (termasuk tagihan open bill/pending).</p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm shrink-0">
                    <button
                        onClick={() => setTimeFilter('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === 'ALL' ? 'bg-brewasa-dark text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Sepanjang Waktu
                    </button>
                    <button
                        onClick={() => setTimeFilter('THIS_MONTH')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === 'THIS_MONTH' ? 'bg-brewasa-dark text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Bulan Ini
                    </button>
                </div>
            </div>

            {topSpenders.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Data</h3>
                    <p className="text-gray-500">Belum ada transaksi dengan nama pelanggan yang tercatat untuk filter ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Top 3 Spenders Highlight Cards */}
                    <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 order-1">
                        {topSpenders.slice(0, 3).map((customer, index) => {
                            const isRank1 = index === 0;
                            const isRank2 = index === 1;
                            const isRank3 = index === 2;
                            
                            return (
                                <div key={customer.name} className={`relative overflow-hidden rounded-2xl p-6 border ${isRank1 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-yellow-100/50 shadow-lg' : isRank2 ? 'bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200 shadow-md' : 'bg-gradient-to-br from-orange-50/50 to-amber-100/50 border-amber-200 shadow-md'} flex flex-col justify-between transition-transform hover:-translate-y-1 duration-300`}>
                                    
                                    {/* Medal Icon Decoration */}
                                    <div className="absolute -right-4 -top-4 opacity-20">
                                        {isRank1 && <Trophy className="w-32 h-32 text-yellow-600" />}
                                        {isRank2 && <Medal className="w-32 h-32 text-gray-500" />}
                                        {isRank3 && <Medal className="w-32 h-32 text-amber-700" />}
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-inner ${isRank1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : isRank2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 'bg-gradient-to-r from-amber-500 to-amber-700'}`}>
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-gray-900 capitalize leading-tight truncate pr-4">{customer.name}</h3>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${isRank1 ? 'bg-yellow-200 text-yellow-800' : isRank2 ? 'bg-gray-200 text-gray-700' : 'bg-amber-200 text-amber-800'}`}>
                                                    {isRank1 ? 'VIP Member' : isRank2 ? 'Loyal Member' : 'Star Member'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1 mb-2 mt-auto pt-4">
                                            <p className="text-sm text-gray-500 font-medium">Total Dihabiskan</p>
                                            <p className={`text-2xl lg:text-3xl font-black ${isRank1 ? 'text-yellow-700' : isRank2 ? 'text-gray-700' : 'text-amber-800'}`}>
                                                Rp {customer.totalSpent.toLocaleString('id-ID')}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-black/5 pt-3 mt-4">
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                                                <Calendar className="w-4 h-4" /> {customer.visitCount} Kedatangan
                                            </div>
                                            <div className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-md">
                                                Terakhir: {new Date(customer.lastVisit).toLocaleDateString('id-ID')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* The rest of the leaderboard list */}
                    {topSpenders.length > 3 && (
                        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden order-2">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-bold text-gray-800">Runner Ups</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {topSpenders.slice(3).map((customer, index) => (
                                    <div key={customer.name} className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-sm shrink-0">
                                                {index + 4}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 capitalize text-base sm:text-lg">{customer.name}</h4>
                                                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" /> {customer.visitCount} Kedatangan
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <p className="font-black text-brewasa-dark text-base sm:text-lg">Rp {customer.totalSpent.toLocaleString('id-ID')}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Update Terakhir: {new Date(customer.lastVisit).toLocaleDateString('id-ID')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TopSpenders;
