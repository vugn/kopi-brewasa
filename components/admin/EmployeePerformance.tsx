import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Coffee, Loader2, Receipt, RefreshCw, Trophy, Users, Wallet } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { usePersistentState } from '../../utils/usePersistentState';
import { dayKey, dayStartISO, formatDay, monthStartKey, shiftDay, todayKey, weekStartKey } from '../../utils/wibDate';

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
const getBounds = (period: Period, customStart: string, customEnd: string) => {
    const today = todayKey();
    if (period === 'TODAY') return { start: today, end: today };
    if (period === 'YESTERDAY') {
        const y = shiftDay(today, -1);
        return { start: y, end: y };
    }
    if (period === 'WEEK') return { start: weekStartKey(today), end: today };
    if (period === 'MONTH') return { start: monthStartKey(today), end: today };
    const st = customStart || today;
    const en = customEnd || st;
    return st <= en ? { start: st, end: en } : { start: en, end: st };
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
    const [fullNames, setFullNames] = useState<Record<string, string>>({}); // username -> nama asli (khusus admin)
    const [staff, setStaff] = useState<Record<string, { username: string; role: string; wage: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [needsMigration, setNeedsMigration] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setNeedsMigration(false);

        // Ambil dari awal bulan ini (untuk tabel perbandingan) atau awal rentang pilihan, mana yang lebih awal.
        const sel = getBounds(period, customStart, customEnd);
        const today = todayKey();
        const from = [sel.start, monthStartKey(today)].sort()[0];
        const to = [sel.end, today].sort().slice(-1)[0];

        const [trxRes, menuRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('id, created_at, total_amount, status, created_by, created_by_name, transaction_items ( quantity, menu_item_id, item_name )')
                .gte('created_at', dayStartISO(shiftDay(from, -1)))
                .lt('created_at', dayStartISO(shiftDay(to, 2)))
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
        const profRes = await supabase.from('profiles').select('id, username, full_name, role, daily_wage');
        if (!profRes.error) {
            const rows = (profRes.data || []) as any[];
            setStaff(Object.fromEntries(rows.map((p) => [p.id, { username: p.username, role: p.role, wage: Number(p.daily_wage) || 0 }])));
            setProfileNames(Object.fromEntries(rows.map((p) => [p.id, p.username])));
            setFullNames(Object.fromEntries(rows.filter((p) => p.full_name).map((p) => [p.username, p.full_name])));
        }

        if (!menuRes.error) {
            setAddonIds(new Set((menuRes.data || []).filter((m: any) => m.category === 'ADDON').map((m: any) => m.id)));
        }
        setLoading(false);
    }, [period, customStart, customEnd]);

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
    const nameOf = (t: RawTransaction) => {
        const username = t.created_by_name || (t.created_by && profileNames[t.created_by]) || UNKNOWN_NAME;
        return fullNames[username] ? `${username} (${fullNames[username]})` : username;
    };

    const aggregate = useCallback(
        (start: string, end: string): Stats[] => {
            const map = new Map<string, Stats>();
            for (const t of transactions) {
                if (!statusOk(t.status)) continue;
                const day = dayKey(t.created_at);
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
        [transactions, statusOk, cupsOf, profileNames, fullNames]
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
    }, [transactions, profileNames, fullNames]);

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
            const k = dayKey(t.created_at);
            if (k < bounds.start || k > bounds.end) continue;
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
    }, [employee, transactions, statusOk, bounds, cupsOf, addonIds]);

    const topCups = Math.max(1, ...stats.map((s) => s.cups));
    const unknownCount = allStats.find((s) => s.key === UNKNOWN_KEY)?.transactions || 0;

    const rangeLabel = (() => {
        const f = (k: string) => formatDay(k, { day: 'numeric', month: 'short', year: 'numeric' });
        return bounds.start === bounds.end ? f(bounds.start) : `${f(bounds.start)} – ${f(bounds.end)}`;
    })();

    // Hari kerja = hari ada minimal satu transaksi (status apa pun) yang dibuat orang itu. Gaji = hari kerja × tarif.
    const payroll = useMemo(() => {
        const rows = new Map<string, { key: string; name: string; wage: number; days: Set<string> }>();
        const ensure = (id: string) => {
            const info = staff[id];
            const username = info?.username || profileNames[id] || id.slice(0, 6);
            const label = fullNames[username] ? `${username} (${fullNames[username]})` : username;
            const row = rows.get(id) || { key: id, name: label, wage: info?.wage || 0, days: new Set<string>() };
            rows.set(id, row);
            return row;
        };
        Object.entries(staff).forEach(([id, p]) => p.role === 'karyawan' && ensure(id));
        for (const t of transactions) {
            if (!t.created_by) continue;
            const day = dayKey(t.created_at);
            if (day < bounds.start || day > bounds.end) continue;
            ensure(t.created_by).days.add(day);
        }
        return [...rows.values()]
            .filter((r) => employee === 'ALL' || r.key === employee)
            .map((r) => ({ ...r, dayList: [...r.days].sort(), count: r.days.size, pay: r.days.size * r.wage }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [staff, transactions, bounds, employee, profileNames, fullNames]);
    const payrollTotal = payroll.reduce((sum, r) => sum + r.pay, 0);
    const [openPayroll, setOpenPayroll] = useState<string | null>(null);

    const saveWage = async (id: string, value: string) => {
        const wage = Math.min(1000000, Math.max(0, parseInt(value.replace(/\D/g, ''), 10) || 0));
        if (wage === (staff[id]?.wage ?? 0)) return;
        const { error: err } = await supabase.from('profiles').update({ daily_wage: wage }).eq('id', id);
        if (err) alert('Gagal simpan tarif: ' + err.message);
        else setStaff((prev) => ({ ...prev, [id]: { ...prev[id], wage } }));
    };

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

                    {/* Hari kerja & gaji */}
                    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                                <h3 className="font-bold text-brewasa-dark">Hari Kerja & Gaji</h3>
                                <p className="text-xs text-gray-500">Hari masuk = hari ada minimal satu transaksi yang dibuat orang itu. Gaji = hari masuk × tarif per hari.</p>
                            </div>
                            <p className="text-sm font-bold text-brewasa-dark">Total {rupiah(payrollTotal)}</p>
                        </div>
                        {payroll.length === 0 ? (
                            <p className="p-6 text-center text-sm text-gray-400">Belum ada karyawan.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {payroll.map((r) => (
                                    <li key={r.key} className="p-4">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <button
                                                onClick={() => setOpenPayroll(openPayroll === r.key ? null : r.key)}
                                                className="min-w-0 flex-1 text-left"
                                                aria-expanded={openPayroll === r.key}
                                            >
                                                <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                                                <p className="text-xs text-gray-500">{r.count} hari masuk • ketuk untuk lihat tanggal</p>
                                            </button>
                                            <label className="text-xs text-gray-500 flex items-center gap-1.5">
                                                Tarif/hari Rp
                                                <input
                                                    key={`${r.key}:${r.wage}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    defaultValue={r.wage ? r.wage.toLocaleString('id-ID') : ''}
                                                    placeholder="0"
                                                    onBlur={(e) => saveWage(r.key, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                                    className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 text-right"
                                                />
                                            </label>
                                            <p className="w-28 text-right font-bold text-brewasa-dark tabular-nums">{rupiah(r.pay)}</p>
                                        </div>
                                        {openPayroll === r.key && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {r.dayList.length === 0 && <span className="text-xs text-gray-400">Belum ada hari masuk di periode ini.</span>}
                                                {r.dayList.map((d) => (
                                                    <span key={d} className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700">
                                                        {formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {r.wage === 0 && <p className="mt-2 text-xs text-amber-700">Tarif belum diisi, gaji dihitung Rp0.</p>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {unknownCount > 0 && (
                            <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                                Transaksi lama tanpa data kasir tidak bisa dihitung sebagai hari masuk siapa pun.
                            </p>
                        )}
                    </section>

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
                                                    {formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}
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
