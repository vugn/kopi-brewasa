import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { Trophy, Medal, Crown, Star, Sparkles, Flame } from 'lucide-react';

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

const RankCard = ({ customer, rank }: { customer: CustomerStats, rank: number }) => {
    const isRank1 = rank === 1;
    const isRank2 = rank === 2;
    const isRank3 = rank === 3;
    
    return (
        <div className={`relative w-full rounded-[2rem] overflow-hidden p-[2px] transition-all duration-500 ${isRank1 ? 'hover:scale-105' : 'hover:scale-102'} group`}>
            {/* Animated Border Gradient for Rank 1 */}
            {isRank1 && (
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-400 opacity-80 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-700" />
            )}
            {isRank2 && <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-500 opacity-60" />}
            {!isRank1 && !isRank2 && <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800 opacity-60" />}
            
            <div className="relative bg-white h-full w-full rounded-[2rem] p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl overflow-hidden backdrop-blur-xl bg-white/95">
                
                {/* Background decoration */}
                {isRank1 && <Sparkles className="absolute top-4 right-4 text-yellow-400/30 w-24 h-24 rotate-12" />}

                <div className="relative mb-6">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center shadow-inner relative z-10 ${
                        isRank1 ? 'bg-gradient-to-br from-yellow-100 to-yellow-300 border-4 border-white' :
                        isRank2 ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white' :
                        'bg-gradient-to-br from-orange-50 to-amber-100 border-4 border-white'
                    }`}>
                        {isRank1 ? <Crown className="w-10 h-10 text-yellow-600 drop-shadow-sm" /> : 
                            isRank2 ? <Medal className="w-10 h-10 text-gray-500" /> : 
                            <Trophy className="w-10 h-10 text-amber-700" />}
                    </div>
                    
                    {/* Badge Rank */}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black shadow-lg border-2 border-white z-20 ${
                        isRank1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                        isRank2 ? 'bg-gradient-to-r from-gray-400 to-gray-600 text-white' :
                        'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
                    }`}>
                        RANK {rank}
                    </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-gray-900 capitalize mb-1 mt-2 line-clamp-1">{customer.name}</h3>
                <div className={`text-xs font-bold uppercase tracking-widest mb-6 ${
                    isRank1 ? 'text-yellow-600' :
                    isRank2 ? 'text-gray-500' :
                    'text-amber-700'
                }`}>
                    {isRank1 ? 'Sultan Brewasa' : isRank2 ? 'Loyal Sobat' : 'Brewasa Star'}
                </div>

                <div className="w-full bg-gray-50 rounded-2xl p-4 mt-auto border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">Total Transaksi</p>
                    <p className="text-lg sm:text-xl font-black text-brewasa-dark">Rp {customer.totalSpent.toLocaleString('id-ID')}</p>
                </div>
            </div>
        </div>
    );
};

const TopSpendersSection: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'ALL' | 'THIS_MONTH'>('THIS_MONTH');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('transactions')
            .select('id, created_at, total_amount, customer_name, status')
            .in('status', ['COMPLETED', 'PENDING'])
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTransactions(data as Transaction[]);
        }
        setLoading(false);
    };

    const topSpenders = useMemo(() => {
        const statsMap = new Map<string, CustomerStats>();

        let filteredTransactions = transactions;
        if (timeFilter === 'THIS_MONTH') {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            filteredTransactions = transactions.filter(t => new Date(t.created_at).getTime() >= startOfMonth);
        }

        filteredTransactions.forEach(t => {
            const rawName = t.customer_name?.trim();
            if (!rawName || rawName.toLowerCase() === 'guest' || rawName.toLowerCase() === 'tanpa nama') return;
            
            const nameKey = rawName.toLowerCase();

            if (!statsMap.has(nameKey)) {
                statsMap.set(nameKey, {
                    name: rawName,
                    totalSpent: 0,
                    visitCount: 0,
                    lastVisit: t.created_at
                });
            }

            const stats = statsMap.get(nameKey)!;
            stats.totalSpent += t.total_amount;
            stats.visitCount += 1;
        });

        // Get Top 5
        return Array.from(statsMap.values())
            .filter(customer => customer.totalSpent > 0)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);
    }, [transactions, timeFilter]);

    if (loading) return null; // Don't show anything on landing page while loading
    if (transactions.length === 0) return null;

    return (
        <section className="py-24 bg-gradient-to-b from-white to-[#F7E9D3] overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brewasa-copper/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12">
                    <div 
                        className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-brewasa-copper/10 text-brewasa-copper text-sm font-bold tracking-wider uppercase"
                    >
                        <Flame className="w-4 h-4" /> Hall of Fame
                    </div>
                    
                    <h2 
                        className="text-4xl md:text-5xl font-black text-brewasa-dark tracking-tight mb-4 transition-all duration-700"
                    >
                        Pelanggan Paling <span className="text-transparent bg-clip-text bg-gradient-to-r from-brewasa-copper to-yellow-600">Setia</span>
                    </h2>
                    <p 
                        className="text-gray-600 max-w-2xl mx-auto mb-10 transition-all duration-700"
                    >
                        Apresiasi tertinggi untuk sobat Brewasa yang tiada hari tanpa mampir ngopi.
                    </p>

                    {/* Filter Tabs */}
                    <div 
                        className="inline-flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 shadow-sm"
                    >
                        <button
                            onClick={() => setTimeFilter('THIS_MONTH')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                timeFilter === 'THIS_MONTH' 
                                ? 'bg-brewasa-dark text-white shadow-md' 
                                : 'text-gray-500 hover:text-brewasa-dark hover:bg-gray-50'
                            }`}
                        >
                            Bulan Ini
                        </button>
                        <button
                            onClick={() => setTimeFilter('ALL')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                timeFilter === 'ALL' 
                                ? 'bg-brewasa-dark text-white shadow-md' 
                                : 'text-gray-500 hover:text-brewasa-dark hover:bg-gray-50'
                            }`}
                        >
                            Sepanjang Waktu
                        </button>
                    </div>
                </div>

                <div>
                    {topSpenders.length > 0 ? (
                        <div 
                            key={timeFilter}
                            className="flex flex-col items-center gap-8 lg:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full"
                        >
                            {/* Rank 1 */}
                            {topSpenders[0] && (
                                <div className="w-full max-w-md">
                                    <RankCard customer={topSpenders[0]} rank={1} />
                                </div>
                            )}

                            {/* Rank 2 & 3 */}
                            <div className="flex flex-col md:flex-row justify-center gap-6 lg:gap-8 w-full max-w-4xl">
                                {topSpenders[1] && (
                                    <div className="w-full md:w-1/2">
                                        <RankCard customer={topSpenders[1]} rank={2} />
                                    </div>
                                )}
                                {topSpenders[2] && (
                                    <div className="w-full md:w-1/2">
                                        <RankCard customer={topSpenders[2]} rank={3} />
                                    </div>
                                )}
                            </div>
                            
                            {/* Rank 4 and 5 */}
                            {topSpenders.length > 3 && (
                                <div 
                                    className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 w-full max-w-2xl"
                                >
                                    {topSpenders.slice(3, 5).map((customer, index) => (
                                        <div key={customer.name} className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm w-full sm:w-1/2 hover:-translate-y-1 transition-transform">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                                                #{index + 4}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 capitalize text-lg line-clamp-1">{customer.name}</h4>
                                                <p className="text-sm font-bold text-brewasa-copper">Rp {customer.totalSpent.toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div 
                            className="text-center p-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/20 animate-in fade-in duration-500"
                        >
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-600 mb-2">Belum ada Sultan bulan ini.</h3>
                            <p className="text-gray-500">Jadilah yang pertama untuk menempati posisi teratas!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default TopSpendersSection;
