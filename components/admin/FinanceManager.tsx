import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, Filter, Loader2, Trash2, Wallet } from 'lucide-react';

type FinanceType = 'INCOME' | 'EXPENSE';
type FinanceMethod = 'CASH' | 'QRIS';
type QuickRange = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';

interface FinanceRecord {
    id: string;
    type: FinanceType;
    amount: number;
    payment_method: FinanceMethod;
    category: string;
    note: string | null;
    transaction_date: string;
    created_at: string;
}

const DEFAULT_CATEGORY: Record<FinanceType, string> = {
    INCOME: 'Penjualan Lain',
    EXPENSE: 'Operasional'
};

const FinanceManager: React.FC = () => {
    const [records, setRecords] = useState<FinanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [type, setType] = useState<FinanceType>('INCOME');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<FinanceMethod>('CASH');
    const [category, setCategory] = useState(DEFAULT_CATEGORY.INCOME);
    const [note, setNote] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));

    const [quickRange, setQuickRange] = useState<QuickRange>('THIS_MONTH');
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | FinanceType>('ALL');
    const [methodFilter, setMethodFilter] = useState<'ALL' | FinanceMethod>('ALL');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    useEffect(() => {
        fetchRecords();
    }, []);

    useEffect(() => {
        setCategory(DEFAULT_CATEGORY[type]);
    }, [type]);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('finance_records')
            .select('*')
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch finance records', error);
            alert('Gagal memuat data keuangan: ' + error.message);
        } else {
            setRecords((data || []) as FinanceRecord[]);
        }
        setLoading(false);
    };

    const getRangeBounds = (range: QuickRange): { start: Date | null; end: Date | null } => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        if (range === 'ALL') return { start: null, end: null };

        if (range === 'THIS_MONTH') {
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999)
            };
        }

        if (range === 'LAST_MONTH') {
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month, 0, 23, 59, 59, 999)
            };
        }

        if (range === 'THIS_YEAR') {
            return {
                start: new Date(year, 0, 1),
                end: new Date(year, 11, 31, 23, 59, 59, 999)
            };
        }

        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59.999') : null;
        return { start, end };
    };

    const filteredRecords = useMemo(() => {
        const monthBounds = monthFilter
            ? {
                start: new Date(monthFilter + '-01T00:00:00'),
                end: new Date(new Date(monthFilter + '-01T00:00:00').getFullYear(), new Date(monthFilter + '-01T00:00:00').getMonth() + 1, 0, 23, 59, 59, 999)
            }
            : null;

        const customBounds = getRangeBounds(quickRange);

        return records.filter((record) => {
            const recordDate = new Date(record.transaction_date + 'T12:00:00');

            const matchesType = typeFilter === 'ALL' || record.type === typeFilter;
            const matchesMethod = methodFilter === 'ALL' || record.payment_method === methodFilter;

            let matchesMonth = true;
            if (monthBounds) {
                matchesMonth = recordDate >= monthBounds.start && recordDate <= monthBounds.end;
            }

            let matchesRange = true;
            if (customBounds.start) {
                matchesRange = matchesRange && recordDate >= customBounds.start;
            }
            if (customBounds.end) {
                matchesRange = matchesRange && recordDate <= customBounds.end;
            }

            return matchesType && matchesMethod && matchesMonth && matchesRange;
        });
    }, [records, monthFilter, quickRange, startDate, endDate, typeFilter, methodFilter]);

    const summary = useMemo(() => {
        return filteredRecords.reduce(
            (acc, row) => {
                if (row.type === 'INCOME') {
                    acc.income += row.amount;
                } else {
                    acc.expense += row.amount;
                }

                if (row.payment_method === 'CASH') {
                    acc.cash += row.amount;
                } else {
                    acc.qris += row.amount;
                }

                return acc;
            },
            { income: 0, expense: 0, cash: 0, qris: 0 }
        );
    }, [filteredRecords]);

    const submitRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);

        if (!parsedAmount || parsedAmount <= 0) {
            alert('Nominal harus lebih dari 0');
            return;
        }

        if (!transactionDate) {
            alert('Tanggal transaksi wajib diisi');
            return;
        }

        setSubmitting(true);
        const payload = {
            type,
            amount: parsedAmount,
            payment_method: paymentMethod,
            category: category.trim() || DEFAULT_CATEGORY[type],
            note: note.trim() || null,
            transaction_date: transactionDate
        };

        const { error } = await supabase.from('finance_records').insert([payload]);
        if (error) {
            console.error('Failed to insert finance record', error);
            alert('Gagal menyimpan data keuangan: ' + error.message);
        } else {
            setAmount('');
            setNote('');
            await fetchRecords();
        }
        setSubmitting(false);
    };

    const deleteRecord = async (id: string) => {
        const confirmed = window.confirm('Hapus catatan keuangan ini?');
        if (!confirmed) return;

        const { error } = await supabase.from('finance_records').delete().eq('id', id);
        if (error) {
            alert('Gagal menghapus data: ' + error.message);
        } else {
            setRecords((prev) => prev.filter((r) => r.id !== id));
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                <Wallet className="w-6 h-6" /> Keuangan
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Total Uang Masuk</p>
                    <p className="text-base md:text-xl font-bold text-green-600">Rp {summary.income.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Total Uang Keluar</p>
                    <p className="text-base md:text-xl font-bold text-red-600">Rp {summary.expense.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Net</p>
                    <p className={`text-base md:text-xl font-bold ${summary.income - summary.expense >= 0 ? 'text-brewasa-dark' : 'text-red-600'}`}>
                        Rp {(summary.income - summary.expense).toLocaleString('id-ID')}
                    </p>
                </div>
                <div className="col-span-2 lg:col-span-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Cash / QRIS</p>
                    <p className="text-sm font-bold text-brewasa-dark">Cash: Rp {summary.cash.toLocaleString('id-ID')}</p>
                    <p className="text-sm font-bold text-brewasa-dark">QRIS: Rp {summary.qris.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={submitRecord} className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm space-y-4 h-fit">
                    <h3 className="font-bold text-brewasa-dark">Input Keuangan</h3>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Jenis</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                                type="button"
                                onClick={() => setType('INCOME')}
                                className={`py-2 rounded-lg border text-sm font-bold ${type === 'INCOME' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Uang Masuk
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('EXPENSE')}
                                className={`py-2 rounded-lg border text-sm font-bold ${type === 'EXPENSE' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Uang Keluar
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Nominal (Rp)</label>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Contoh: 50000"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Metode</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as FinanceMethod)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                        >
                            <option value="CASH">Cash</option>
                            <option value="QRIS">QRIS</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Kategori</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Contoh: Operasional, Gaji, Penjualan Event"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Tanggal</label>
                        <input
                            type="date"
                            value={transactionDate}
                            onChange={(e) => setTransactionDate(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-600">Catatan (Opsional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            placeholder="Catatan transaksi..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 rounded-lg bg-brewasa-dark text-white font-bold hover:bg-brewasa-copper disabled:opacity-50"
                    >
                        {submitting ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                </form>

                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-bold text-brewasa-dark flex items-center gap-2"><Filter className="w-4 h-4" /> Filter Data</h3>
                        <button
                            type="button"
                            onClick={() => setShowMobileFilters((prev) => !prev)}
                            className="md:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700"
                        >
                            {showMobileFilters ? 'Tutup' : 'Buka'}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block space-y-3`}>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-500">Quick Range</label>
                                <select
                                    value={quickRange}
                                    onChange={(e) => setQuickRange(e.target.value as QuickRange)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                >
                                    <option value="ALL">Semua Tanggal</option>
                                    <option value="THIS_MONTH">Bulan Ini</option>
                                    <option value="LAST_MONTH">Bulan Lalu</option>
                                    <option value="THIS_YEAR">Tahun Ini</option>
                                    <option value="CUSTOM">Custom Tanggal</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Filter Bulan</label>
                                <input
                                    type="month"
                                    value={monthFilter}
                                    onChange={(e) => setMonthFilter(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Jenis</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as 'ALL' | FinanceType)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                >
                                    <option value="ALL">Semua</option>
                                    <option value="INCOME">Uang Masuk</option>
                                    <option value="EXPENSE">Uang Keluar</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Metode</label>
                                <select
                                    value={methodFilter}
                                    onChange={(e) => setMethodFilter(e.target.value as 'ALL' | FinanceMethod)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                >
                                    <option value="ALL">Semua</option>
                                    <option value="CASH">Cash</option>
                                    <option value="QRIS">QRIS</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setQuickRange('CUSTOM');
                                        setStartDate(e.target.value);
                                    }}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Tanggal Akhir</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setQuickRange('CUSTOM');
                                        setEndDate(e.target.value);
                                    }}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setMonthFilter('');
                                    setQuickRange('ALL');
                                    setStartDate('');
                                    setEndDate('');
                                    setTypeFilter('ALL');
                                    setMethodFilter('ALL');
                                }}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                            >
                                Reset Semua Filter
                            </button>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        {loading ? (
                            <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin text-brewasa-copper" /></div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                                            <tr>
                                                <th className="p-3 text-left">Tanggal</th>
                                                <th className="p-3 text-left">Jenis</th>
                                                <th className="p-3 text-left">Kategori</th>
                                                <th className="p-3 text-left">Metode</th>
                                                <th className="p-3 text-right">Nominal</th>
                                                <th className="p-3 text-left">Catatan</th>
                                                <th className="p-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-6 text-center text-gray-400">Belum ada data untuk filter ini.</td>
                                                </tr>
                                            )}
                                            {filteredRecords.map((record) => (
                                                <tr key={record.id} className="hover:bg-gray-50">
                                                    <td className="p-3">{new Date(record.transaction_date).toLocaleDateString('id-ID')}</td>
                                                    <td className="p-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${record.type === 'INCOME' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {record.type === 'INCOME' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                                                            {record.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-medium text-gray-700">{record.category}</td>
                                                    <td className="p-3">{record.payment_method}</td>
                                                    <td className={`p-3 text-right font-bold ${record.type === 'INCOME' ? 'text-green-700' : 'text-red-700'}`}>
                                                        Rp {record.amount.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-3 text-gray-600">{record.note || '-'}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => deleteRecord(record.id)}
                                                            className="p-1.5 rounded text-red-500 hover:bg-red-50"
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

                                {/* Mobile Cards */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {filteredRecords.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">Belum ada data untuk filter ini.</div>
                                    )}
                                    {filteredRecords.map((record) => (
                                        <div key={record.id} className="p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">{new Date(record.transaction_date).toLocaleDateString('id-ID')}</p>
                                                    <p className="font-semibold text-gray-800 text-sm">{record.category}</p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${record.type === 'INCOME' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {record.type === 'INCOME' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                                                    {record.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs text-gray-500">Metode: <span className="font-semibold text-gray-700">{record.payment_method}</span></p>
                                                <p className={`text-sm font-bold ${record.type === 'INCOME' ? 'text-green-700' : 'text-red-700'}`}>
                                                    Rp {record.amount.toLocaleString('id-ID')}
                                                </p>
                                            </div>

                                            {record.note && (
                                                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5">{record.note}</p>
                                            )}

                                            <div className="pt-1">
                                                <button
                                                    onClick={() => deleteRecord(record.id)}
                                                    className="w-full py-2 rounded-lg border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50"
                                                    title="Hapus"
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        <Trash2 className="w-4 h-4" /> Hapus
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceManager;