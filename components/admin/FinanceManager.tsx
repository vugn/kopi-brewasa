import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Plus, RotateCcw, SlidersHorizontal, Trash2, Wallet, Download, X } from 'lucide-react';
import { usePersistentState, clearPersisted } from '../../utils/usePersistentState';
import * as XLSX from 'xlsx';
type FinanceType = 'INCOME' | 'EXPENSE';
type FinanceMethod = 'CASH' | 'QRIS';
type QuickRange = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'MONTH' | 'CUSTOM';

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

    // Semua filter disimpan di localStorage supaya tidak reset waktu balik dari recent apps / refresh.
    const [quickRange, setQuickRange] = usePersistentState<QuickRange>('fin.range', 'THIS_MONTH');
    const [monthFilter, setMonthFilter] = usePersistentState('fin.month', new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = usePersistentState('fin.start', '');
    const [endDate, setEndDate] = usePersistentState('fin.end', '');
    const [typeFilter, setTypeFilter] = usePersistentState<'ALL' | FinanceType>('fin.type', 'ALL');
    const [methodFilter, setMethodFilter] = usePersistentState<'ALL' | FinanceMethod>('fin.method', 'ALL');
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistentState('fin.perPage', 10);

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

        if (range === 'MONTH') {
            if (!monthFilter) return { start: null, end: null };
            const [y, m] = monthFilter.split('-').map(Number);
            return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) };
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
        const customBounds = getRangeBounds(quickRange);

        return records.filter((record) => {
            const recordDate = new Date(record.transaction_date + 'T12:00:00');

            const matchesType = typeFilter === 'ALL' || record.type === typeFilter;
            const matchesMethod = methodFilter === 'ALL' || record.payment_method === methodFilter;

            let matchesRange = true;
            if (customBounds.start) {
                matchesRange = matchesRange && recordDate >= customBounds.start;
            }
            if (customBounds.end) {
                matchesRange = matchesRange && recordDate <= customBounds.end;
            }

            return matchesType && matchesMethod && matchesRange;
        });
    }, [records, monthFilter, quickRange, startDate, endDate, typeFilter, methodFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [quickRange, monthFilter, startDate, endDate, typeFilter, methodFilter]);

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const summary = useMemo(() => {
        return filteredRecords.reduce(
            (acc, row) => {
                if (row.type === 'INCOME') {
                    acc.income += row.amount;
                    if (row.payment_method === 'CASH') {
                        acc.income_cash += row.amount;
                    } else {
                        acc.income_qris += row.amount;
                    }
                } else {
                    acc.expense += row.amount;
                    if (row.payment_method === 'CASH') {
                        acc.expense_cash += row.amount;
                    } else {
                        acc.expense_qris += row.amount;
                    }
                }

                return acc;
            },
            { income: 0, expense: 0, income_cash: 0, income_qris: 0, expense_cash: 0, expense_qris: 0 }
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
            setShowForm(false);
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

    const filtersActive = quickRange !== 'THIS_MONTH' || typeFilter !== 'ALL' || methodFilter !== 'ALL';
    const resetFilters = () => {
        clearPersisted('fin.range', 'fin.month', 'fin.start', 'fin.end', 'fin.type', 'fin.method');
        setQuickRange('THIS_MONTH');
        setMonthFilter(new Date().toISOString().slice(0, 7));
        setStartDate('');
        setEndDate('');
        setTypeFilter('ALL');
        setMethodFilter('ALL');
    };

    const exportToExcel = () => {
        const dataToExport = filteredRecords.map(t => ({
            Tanggal: new Date(t.transaction_date).toLocaleDateString('id-ID'),
            Jenis: t.type === 'INCOME' ? 'Uang Masuk' : 'Uang Keluar',
            Kategori: t.category,
            Metode: t.payment_method,
            Nominal: t.amount,
            Catatan: t.note || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
        XLSX.writeFile(wb, `Laporan_Keuangan_Brewasa_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const net = summary.income - summary.expense;

    const RANGES: { id: QuickRange; label: string }[] = [
        { id: 'THIS_MONTH', label: 'Bulan Ini' },
        { id: 'LAST_MONTH', label: 'Bulan Lalu' },
        { id: 'MONTH', label: 'Pilih Bulan' },
        { id: 'THIS_YEAR', label: 'Tahun Ini' },
        { id: 'CUSTOM', label: 'Tanggal' },
        { id: 'ALL', label: 'Semua' },
    ];

    const segBtn = (active: boolean) =>
        `px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${active ? 'bg-brewasa-dark text-white border-brewasa-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`;

    const rangeLabel = RANGES.find((r) => r.id === quickRange)?.label ?? '';
    const activeSummary = [
        quickRange === 'MONTH' && monthFilter ? monthFilter : rangeLabel,
        typeFilter !== 'ALL' ? (typeFilter === 'INCOME' ? 'Masuk' : 'Keluar') : null,
        methodFilter !== 'ALL' ? methodFilter : null,
    ].filter(Boolean).join(' • ');

    const filterContent = (
        <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                {RANGES.map((r) => (
                    <button key={r.id} onClick={() => setQuickRange(r.id)} className={segBtn(quickRange === r.id)}>
                        {r.label}
                    </button>
                ))}
            </div>

            {quickRange === 'MONTH' && (
                <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
            )}
            {quickRange === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        aria-label="Tanggal mulai"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        aria-label="Tanggal akhir"
                    />
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex gap-1">
                    {([['ALL', 'Semua'], ['INCOME', 'Masuk'], ['EXPENSE', 'Keluar']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setTypeFilter(id)} className={segBtn(typeFilter === id)}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="inline-flex gap-1">
                    {([['ALL', 'Cash+QRIS'], ['CASH', 'Cash'], ['QRIS', 'QRIS']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setMethodFilter(id)} className={segBtn(methodFilter === id)}>
                            {label}
                        </button>
                    ))}
                </div>
                {filtersActive && (
                    <button
                        onClick={resetFilters}
                        className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-4 md:space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                    <Wallet className="w-6 h-6" /> Keuangan
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportToExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        title="Export data yang sedang difilter ke Excel"
                    >
                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export Excel</span><span className="sm:hidden">Export</span>
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brewasa-dark text-white text-sm font-bold hover:bg-brewasa-copper"
                    >
                        <Plus className="w-4 h-4" /> Catat Keuangan
                    </button>
                </div>
            </div>

            {/* Filter: di desktop tampil di atas; di mobile lewat tombol Filter melayang di bawah */}
            <div className="hidden md:block bg-white border border-gray-100 rounded-xl p-3 shadow-sm">{filterContent}</div>
            <p className="md:hidden text-xs text-gray-500">Filter: <span className="font-semibold text-gray-700">{activeSummary}</span></p>

            {/* Ringkasan */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Uang Masuk</p>
                    <p className="text-base md:text-xl font-bold text-green-600">Rp {summary.income.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Uang Keluar</p>
                    <p className="text-base md:text-xl font-bold text-red-600">Rp {summary.expense.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500">Selisih (Net)</p>
                    <p className={`text-base md:text-xl font-bold ${net >= 0 ? 'text-brewasa-dark' : 'text-red-600'}`}>
                        {net < 0 ? '-' : ''}Rp {Math.abs(net).toLocaleString('id-ID')}
                    </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-0.5">
                    <p className="text-xs text-gray-500">Net per Metode</p>
                    <p className="text-sm font-bold flex justify-between gap-2">
                        <span className="text-gray-500 font-medium">Cash</span>
                        <span className={summary.income_cash - summary.expense_cash >= 0 ? 'text-brewasa-dark' : 'text-red-600'}>
                            Rp {(summary.income_cash - summary.expense_cash).toLocaleString('id-ID')}
                        </span>
                    </p>
                    <p className="text-sm font-bold flex justify-between gap-2">
                        <span className="text-gray-500 font-medium">QRIS</span>
                        <span className={summary.income_qris - summary.expense_qris >= 0 ? 'text-brewasa-dark' : 'text-red-600'}>
                            Rp {(summary.income_qris - summary.expense_qris).toLocaleString('id-ID')}
                        </span>
                    </p>
                </div>
            </div>

            {/* Daftar */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-brewasa-dark">Catatan Keuangan</h3>
                    <span className="text-xs text-gray-500">{filteredRecords.length} catatan</span>
                </div>
                    <div className="rounded-b-xl overflow-hidden">
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
                                            {paginatedRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-6 text-center text-gray-400">Belum ada data untuk filter ini.</td>
                                                </tr>
                                            )}
                                            {paginatedRecords.map((record) => (
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
                                    {paginatedRecords.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">Belum ada data untuk filter ini.</div>
                                    )}
                                    {paginatedRecords.map((record) => (
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

                                {/* Pagination Controls */}
                                {filteredRecords.length > 0 && (
                                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Tampilkan</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => {
                                                    setItemsPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                            <span className="text-sm text-gray-600">data per halaman</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                            >
                                                Sebelumnya
                                            </button>
                                            <span className="text-sm text-gray-600 px-2">
                                                Halaman {currentPage} dari {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage >= totalPages}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                            >
                                                Selanjutnya
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
            </div>

            <button
                onClick={() => setShowFilters(true)}
                className="md:hidden fixed bottom-5 right-4 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brewasa-dark text-white text-sm font-bold shadow-lg"
            >
                <SlidersHorizontal className="w-4 h-4" /> Filter{filtersActive ? ' •' : ''}
            </button>

            {showFilters && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowFilters(false)}>
                    <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-brewasa-dark">Filter</h3>
                            <button onClick={() => setShowFilters(false)} className="p-1 text-gray-400" aria-label="Tutup"><X className="w-5 h-5" /></button>
                        </div>
                        {filterContent}
                        <button onClick={() => setShowFilters(false)} className="w-full py-3 rounded-lg bg-brewasa-dark text-white font-bold">
                            Tampilkan {filteredRecords.length} catatan
                        </button>
                    </div>
                </div>
            )}

            {/* Form catat keuangan (modal) */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => setShowForm(false)}>
                    <form
                        onSubmit={submitRecord}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-brewasa-dark">Catat Keuangan</h3>
                            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Tutup">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setType('INCOME')}
                                className={`py-2.5 rounded-lg border text-sm font-bold ${type === 'INCOME' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white border-gray-200 text-gray-500'}`}>
                                Uang Masuk
                            </button>
                            <button type="button" onClick={() => setType('EXPENSE')}
                                className={`py-2.5 rounded-lg border text-sm font-bold ${type === 'EXPENSE' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white border-gray-200 text-gray-500'}`}>
                                Uang Keluar
                            </button>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Nominal (Rp)</label>
                            <input type="number" inputMode="numeric" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                                placeholder="Contoh: 50000" className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200" required autoFocus />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Metode</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as FinanceMethod)}
                                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white">
                                    <option value="CASH">Cash</option>
                                    <option value="QRIS">QRIS</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Tanggal</label>
                                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)}
                                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200" required />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Kategori</label>
                            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                                placeholder="Contoh: Operasional, Gaji, Penjualan Event" className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200" required />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Catatan (opsional)</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200" placeholder="Catatan transaksi..." />
                        </div>

                        <button type="submit" disabled={submitting}
                            className="w-full py-3 rounded-lg bg-brewasa-dark text-white font-bold hover:bg-brewasa-copper disabled:opacity-50">
                            {submitting ? 'Menyimpan...' : 'Simpan Catatan'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;