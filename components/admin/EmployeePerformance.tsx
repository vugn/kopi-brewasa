import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Coffee, Loader2, Receipt, RefreshCw, Trophy, Users, Wallet } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { usePersistentState } from '../../utils/usePersistentState';

type Period = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type StatusMode = 'VALID' | 'COMPLETED' | 'ALL';

interface RawItem {
    quantity: number;
    menu_item_id: string | null;
    item_name: string;
}

interface RawTransaction {
    id: string;
    created_at: string;
    total_amount: number;
    status: string;
    created_by: string | null;
    created_by_name: string | null;
    transaction_items: RawItem[] | null;
}

interface Stats {
    key: string;
    name: string;
    transactions: number;
    cups: number;
    items: number;
    revenue: number;
    lastAt: string | null;
}

const UNKNOWN_KEY = '__unknown__';
const UNKNOWN_NAME = 'Tidak diketahui';

const PERIODS: { id: Period; label: string }[] = [
    { id: 'TODAY', label: 'Hari Ini' },
    { id: 'YESTERDAY', label: 'Kemarin' },
    { id: 'WEEK', label: 'Minggu Ini' },
    { id: 'MONTH', label: 'Bulan Ini' },
    { id: 'CUSTOM', label: 'Pilih Tanggal' },
];

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pad = (n: number) => String(n).padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromInputDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// Sama dengan Riwayat Transaksi: transaksi sebelum jam buka dihitung sebagai hari sebelumnya.
const businessDay = (value: string | Date, openHour: number) => {
    const d = new Date(value);
    if (d.getHours() < openHour) d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const readOpeningHour = () => {
    try {
        const saved = localStorage.getItem('kopi-brewasa.openingHour');
        const n = saved ? parseInt(saved, 10) : 16;
        return Number.isFinite(n) ? n : 16;
    } catch {
        return 16;
    }
};

const getBounds = (period: Period, customStart: string, customEnd: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // "today" sebenarnya hari bisnis saat ini
    const openHour = readOpeningHour();
    const biz = businessDay(new Date(), openHour);

    if (period === 'TODAY') return { start: biz, end: biz };
    if (period === 'YESTERDAY') {
        const y = new Date(biz);
        y.setDate(y.getDate() - 1);
        return { start: y, end: y };
    }
    if (period === 'WEEK') {
        const s = new Date(biz);
        s.setDate(s.getDate() - s.getDay());
        return { start: s, end: biz };
    }
    if (period === 'MONTH') {
        return { start: new Date(biz.getFullYear(), biz.getMonth(), 1), end: biz };
    }
    const s = customStart ? fromInputDate(customStart) : biz;
    const e = customEnd ? fromInputDate(customEnd) : s;
    return s <= e ? { start: s, end: e } : { start: e, end: s };
};

const EmployeePerformance: React.FC = () => {
    const [period, setPeriod] = usePersistentState<Period>('perf.period', 'TODAY');
    const [customStart, setCustomStart] = usePersistentState('perf.start', '');
    const [customEnd, setCustomEnd] = usePersistentState('perf.end', '');
    const [employee, setEmployee] = usePersistentState('perf.employee', 'ALL');
    const [statusMode, setStatusMode] = usePersistentState<StatusMode>('perf.status', 'VALID');

    const [transactions, setTransactions] = useState<RawTransaction[]>([]);
    const [addonIds, setAddonIds] = useState<Set<string>>(new Set());
    const [profileNames, setProfileNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [needsMigration, setNeedsMigration] = useState(false);

    const openHour = readOpeningHour();

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setNeedsMigration(false);

        // Ambil dari awal bulan ini (untuk tabel perbandingan) atau awal rentang pilihan, mana yang lebih awal.
        const sel = getBounds(period, customStart, customEnd);
        const biz = businessDay(new Date(), openHour);
        const monthStart = new Date(biz.getFullYear(), biz.getMonth(), 1);
        const from = new Date(Math.min(sel.start.getTime(), monthStart.getTime()));
        from.setDate(from.getDate() - 1);
        const to = new Date(Math.max(sel.end.getTime(), biz.getTime()));
        to.setDate(to.getDate() + 2);

        const [trxRes, menuRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('id, created_at, total_amount, status, created_by, created_by_name, transaction_items ( quantity, menu_item_id, item_name )')
                .gte('created_at', from.toISOString())
                .lt('created_at', to.toISOString())
                .order('created_at', { ascending: false }),
            supabase.from('menu_items').select('id, category'),
        ]);

        if (trxRes.error) {
            if (/created_by/i.test(trxRes.error.message)) {
                setNeedsMigration(true);
            } else {
                setError(trxRes.error.message);
            }
            setTransactions([]);
        } else {
            setTransactions((trxRes.data || []) as unknown as RawTransaction[]);
        }

        // Cadangan nama: kalau created_by_name kosong tapi created_by ada, ambil username dari profiles.
        const profRes = await supabase.from('profiles').select('id, username');
        if (!profRes.error) {
            setProfileNames(Object.fromEntries((profRes.data || []).map((p: any) => [p.id, p.username])));
        }

        if (!menuRes.error) {
            setAddonIds(new Set((menuRes.data || []).filter((m: any) => m.category === 'ADDON').map((m: any) => m.id)));
        }
        setLoading(false);
    }, [period, customStart, customEnd, openHour]);

    useEffect(() => {
        load();
    }, [load]);

    const statusOk = useCallback(
        (status: string) => {
            if (statusMode === 'ALL') return true;
            if (statusMode === 'COMPLETED') return status === 'COMPLETED';
            return status !== 'CANCELLED';
        },
        [statusMode]
    );

    const cupsOf = useCallback(
        (t: RawTransaction) =>
            (t.transaction_items || []).reduce(
                (sum, i) => sum + (i.menu_item_id && addonIds.has(i.menu_item_id) ? 0 : i.quantity || 0),
                0
            ),
        [addonIds]
    );
    const itemsOf = (t: RawTransaction) => (t.transaction_items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);

    const keyOf = (t: RawTransaction) => t.created_by || (t.created_by_name ? `name:${t.created_by_name}` : UNKNOWN_KEY);
    const nameOf = (t: RawTransaction) =>
        t.created_by_name || (t.created_by && profileNames[t.created_by]) || UNKNOWN_NAME;

    const aggregate = useCallback(
        (start: Date, end: Date): Stats[] => {
            const map = new Map<string, Stats>();
            for (const t of transactions) {
                if (!statusOk(t.status)) continue;
                const day = businessDay(t.created_at, openHour);
                if (day < start || day > end) continue;

                const key = keyOf(t);
                const row =
                    map.get(key) ||
                    ({ key, name: nameOf(t), transactions: 0, cups: 0, items: 0, revenue: 0, lastAt: null } as Stats);
                row.transactions += 1;
                row.cups += cupsOf(t);
                row.items += itemsOf(t);
                row.revenue += t.status === 'CANCELLED' ? 0 : t.total_amount || 0;
                if (!row.lastAt || t.created_at > row.lastAt) row.lastAt = t.created_at;
                map.set(key, row);
            }
            return [...map.values()].sort((a, b) => b.cups - a.cups || b.transactions - a.transactions);
        },
        [transactions, statusOk, cupsOf, openHour, profileNames]
    );

    const bounds = useMemo(() => getBounds(period, customStart, customEnd), [period, customStart, customEnd]);
    const allStats = useMemo(() => aggregate(bounds.start, bounds.end), [aggregate, bounds]);
    const stats = useMemo(
        () => (employee === 'ALL' ? allStats : allStats.filter((s) => s.key === employee)),
        [allStats, employee]
    );

    // Daftar karyawan untuk dropdown (dari semua data yang termuat, bukan hanya periode terpilih)
    const employeeOptions = useMemo(() => {
        const map = new Map<string, string>();
        transactions.forEach((t) => map.set(keyOf(t), nameOf(t)));
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [transactions, profileNames]);

    // Kalau karyawan tersimpan sudah tidak ada di data, balik ke "Semua"
    useEffect(() => {
        if (!loading && employee !== 'ALL' && !employeeOptions.some(([k]) => k === employee)) setEmployee('ALL');
    }, [loading, employee, employeeOptions, setEmployee]);

    const totals = useMemo(
        () =>
            stats.reduce(
                (acc, s) => ({
                    cups: acc.cups + s.cups,
                    transactions: acc.transactions + s.transactions,
                    revenue: acc.revenue + s.revenue,
                }),
                { cups: 0, transactions: 0, revenue: 0 }
            ),
        [stats]
    );

    // Perbandingan Hari Ini / Minggu Ini / Bulan Ini (tidak terpengaruh filter periode)
    const comparison = useMemo(() => {
        const today = getBounds('TODAY', '', '');
        const week = getBounds('WEEK', '', '');
        const month = getBounds('MONTH', '', '');
        const d = aggregate(today.start, today.end);
        const w = aggregate(week.start, week.end);
        const m = aggregate(month.start, month.end);
        const keys = new Map<string, string>();
        [...d, ...w, ...m].forEach((s) => keys.set(s.key, s.name));
        return [...keys.entries()]
            .map(([key, name]) => ({
                key,
                name,
                today: d.find((s) => s.key === key)?.cups || 0,
                week: w.find((s) => s.key === key)?.cups || 0,
                month: m.find((s) => s.key === key)?.cups || 0,
            }))
            .filter((r) => employee === 'ALL' || r.key === employee)
            .sort((a, b) => b.month - a.month);
    }, [aggregate, employee]);

    // Detail harian & menu terlaris untuk karyawan terpilih
    const detail = useMemo(() => {
        if (employee === 'ALL') return null;
        const perDay = new Map<string, { cups: number; transactions: number; revenue: number }>();
        const perMenu = new Map<string, number>();
        for (const t of transactions) {
            if (!statusOk(t.status) || keyOf(t) !== employee) continue;
            const day = businessDay(t.created_at, openHour);
            if (day < bounds.start || day > bounds.end) continue;
            const k = toInputDate(day);
            const row = perDay.get(k) || { cups: 0, transactions: 0, revenue: 0 };
            row.cups += cupsOf(t);
            row.transactions += 1;
            row.revenue += t.total_amount || 0;
            perDay.set(k, row);
            (t.transaction_items || []).forEach((i) => {
                if (i.menu_item_id && addonIds.has(i.menu_item_id)) return;
                perMenu.set(i.item_name, (perMenu.get(i.item_name) || 0) + (i.quantity || 0));
            });
        }
        return {
            days: [...perDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
            menus: [...perMenu.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        };
    }, [employee, transactions, statusOk, bounds, cupsOf, openHour, addonIds]);

    const topCups = Math.max(1, ...stats.map((s) => s.cups));
    const unknownCount = allStats.find((s) => s.key === UNKNOWN_KEY)?.transactions || 0;

    const rangeLabel = (() => {
        const f = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        return bounds.start.getTime() === bounds.end.getTime() ? f(bounds.start) : `${f(bounds.start)} – ${f(bounds.end)}`;
    })();

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                        <Users className="w-6 h-6" /> Kinerja Karyawan
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Siapa yang melayani berapa cup & transaksi. {rangeLabel}</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
                </button>
            </div>

            {needsMigration && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Database belum disiapkan</p>
                        <p className="mt-1">
                            Jalankan file <code className="px-1 bg-white rounded">migrations/20261105_add_transaction_cashier.sql</code> di
                            Supabase SQL Editor supaya sistem bisa mencatat siapa yang membuat transaksi.
                        </p>
                    </div>
                </div>
            )}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">Gagal memuat data: {error}</div>
            )}

            {/* Filter bar */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 shadow-sm space-y-3 sticky top-14 md:top-0 z-10">
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                period === p.id
                                    ? 'bg-brewasa-dark text-white border-brewasa-dark'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {period === 'CUSTOM' && (
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-gray-500">
                            Dari
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800"
                            />
                        </label>
                        <label className="text-xs text-gray-500">
                            Sampai
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800"
                            />
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">
                        Karyawan
                        <select
                            value={employee}
                            onChange={(e) => setEmployee(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white"
                        >
                            <option value="ALL">Semua karyawan</option>
                            {employeeOptions.map(([k, n]) => (
                                <option key={k} value={k}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-gray-500">
                        Status transaksi
                        <select
                            value={statusMode}
                            onChange={(e) => setStatusMode(e.target.value as StatusMode)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white"
                        >
                            <option value="VALID">Tidak dibatalkan</option>
                            <option value="COMPLETED">Selesai saja</option>
                            <option value="ALL">Semua (termasuk batal)</option>
                        </select>
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="py-16 flex justify-center">
                    <Loader2 className="animate-spin text-brewasa-copper" />
                </div>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <SummaryCard icon={<Coffee className="w-4 h-4" />} label="Total Cup" value={totals.cups.toLocaleString('id-ID')} />
                        <SummaryCard icon={<Receipt className="w-4 h-4" />} label="Transaksi" value={totals.transactions.toLocaleString('id-ID')} />
                        <SummaryCard icon={<Wallet className="w-4 h-4" />} label="Omzet" value={rupiah(totals.revenue)} />
                        <SummaryCard icon={<Users className="w-4 h-4" />} label="Karyawan Aktif" value={String(stats.filter((s) => s.key !== UNKNOWN_KEY).length)} />
                    </div>

                    {unknownCount > 0 && (
                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                            {unknownCount} transaksi di periode ini tidak punya data kasir (dibuat sebelum fitur ini aktif), jadi masuk ke “{UNKNOWN_NAME}”.
                        </p>
                    )}

                    {/* Leaderboard */}
                    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-brewasa-copper" />
                            <h3 className="font-bold text-brewasa-dark">Peringkat — {PERIODS.find((p) => p.id === period)?.label}</h3>
                        </div>
                        {stats.length === 0 ? (
                            <p className="p-8 text-center text-sm text-gray-400">Belum ada transaksi di periode ini.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {stats.map((s, idx) => (
                                    <li key={s.key}>
                                        <button
                                            onClick={() => setEmployee(employee === s.key ? 'ALL' : s.key)}
                                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${employee === s.key ? 'bg-brewasa-copper/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                                                        idx === 0 && s.key !== UNKNOWN_KEY ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                                    }`}
                                                >
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                                                        <p className="font-bold text-brewasa-dark whitespace-nowrap">{s.cups} cup</p>
                                                    </div>
                                                    <div className="h-2 mt-2 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-brewasa-copper"
                                                            style={{ width: `${(s.cups / topCups) * 100}%` }}
                                                        />
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                                        <span>{s.transactions} transaksi</span>
                                                        <span>{rupiah(s.revenue)}</span>
                                                        <span>≈ {(s.cups / Math.max(1, s.transactions)).toFixed(1)} cup/transaksi</span>
                                                        {s.lastAt && (
                                                            <span>
                                                                terakhir{' '}
                                                                {new Date(s.lastAt).toLocaleString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Hari ini / Minggu ini / Bulan ini */}
                    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-brewasa-dark">Perbandingan Cup</h3>
                            <p className="text-xs text-gray-500">Hari ini, minggu ini (mulai Minggu), dan bulan ini.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-3 text-left font-semibold">Karyawan</th>
                                        <th className="p-3 text-right font-semibold">Hari Ini</th>
                                        <th className="p-3 text-right font-semibold">Minggu Ini</th>
                                        <th className="p-3 text-right font-semibold">Bulan Ini</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {comparison.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-gray-400">
                                                Belum ada data.
                                            </td>
                                        </tr>
                                    )}
                                    {comparison.map((r) => (
                                        <tr key={r.key} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800">{r.name}</td>
                                            <td className="p-3 text-right tabular-nums">{r.today}</td>
                                            <td className="p-3 text-right tabular-nums">{r.week}</td>
                                            <td className="p-3 text-right tabular-nums font-bold text-brewasa-dark">{r.month}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Detail per karyawan */}
                    {detail && (
                        <section className="grid gap-4 md:grid-cols-2">
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 font-bold text-brewasa-dark">Per Hari</div>
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        {detail.days.length === 0 && (
                                            <tr>
                                                <td className="p-6 text-center text-gray-400">Tidak ada data.</td>
                                            </tr>
                                        )}
                                        {detail.days.map(([day, v]) => (
                                            <tr key={day}>
                                                <td className="p-3 text-gray-700">
                                                    {fromInputDate(day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </td>
                                                <td className="p-3 text-right tabular-nums font-semibold">{v.cups} cup</td>
                                                <td className="p-3 text-right text-gray-500 tabular-nums">{v.transactions} trx</td>
                                                <td className="p-3 text-right text-gray-500 tabular-nums hidden sm:table-cell">{rupiah(v.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 font-bold text-brewasa-dark">Menu yang Paling Sering Dibuat</div>
                                <ul className="divide-y divide-gray-100 text-sm">
                                    {detail.menus.length === 0 && <li className="p-6 text-center text-gray-400">Tidak ada data.</li>}
                                    {detail.menus.map(([name, qty]) => (
                                        <li key={name} className="p-3 flex justify-between gap-3">
                                            <span className="text-gray-700 truncate">{name}</span>
                                            <span className="font-semibold tabular-nums">{qty}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
            {icon} {label}
        </p>
        <p className="mt-1 text-lg md:text-xl font-bold text-brewasa-dark break-words">{value}</p>
    </div>
);

export default EmployeePerformance;
