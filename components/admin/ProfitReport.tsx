import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Info, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { usePersistentState } from '../../utils/usePersistentState';
import { dayKey } from '../../utils/wibDate';

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // WIB
const MONTHS_BACK = 6;

interface MonthStats {
    key: string; // YYYY-MM
    trx: number;
    items: number;
    omzet: number; // total_amount (sudah net diskon)
    diskon: number;
    hpp: number; // bahan (resep) + konsinyasi
    hppItemsTanpaResep: number;
    gaji: number; // hari kerja × tarif harian (dari Kinerja Karyawan)
    hariKerja: number; // total hari masuk semua karyawan
    gajiNyata: boolean; // false = tarif belum diisi, pakai asumsi tetap
}

const rupiah = (n: number) => (n < 0 ? '-Rp ' : 'Rp ') + Math.abs(Math.round(n)).toLocaleString('id-ID');
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const monthKeyOf = (iso: string) => new Date(new Date(iso).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 7);
const jakartaNow = () => new Date(Date.now() + TZ_OFFSET_MS);
const currentMonthKey = () => jakartaNow().toISOString().slice(0, 7);
const shiftMonth = (key: string, delta: number) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return d.toISOString().slice(0, 7);
};
const monthStartISO = (key: string) => new Date(`${key}-01T00:00:00+07:00`).toISOString();
const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const daysInMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

type Status = 'ok' | 'warn' | 'bad';
const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
    ok: { label: 'Sehat', cls: 'bg-green-50 text-green-700 border-green-200' },
    warn: { label: 'Waspada', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    bad: { label: 'Bahaya', cls: 'bg-red-50 text-red-700 border-red-200' },
};
// Patokan umum kedai kopi kecil, bukan angka pasti. Makin kecil makin bagus, kecuali laba bersih.
const rate = (value: number, okMax: number, warnMax: number): Status => (value <= okMax ? 'ok' : value <= warnMax ? 'warn' : 'bad');

async function fetchAllTransactions(startISO: string, endISO: string) {
    const rows: any[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from('transactions')
            .select('id, created_at, status, created_by, total_amount, discount_amount, transaction_items ( quantity, price, menu_item_id, is_consignment, consignment_cost )')
            .gte('created_at', startISO)
            .lt('created_at', endISO)
            .order('created_at', { ascending: true })
            .range(from, from + page - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < page) break;
    }
    return rows;
}

const NumberField: React.FC<{ label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number }> = ({
    label,
    value,
    onChange,
    suffix,
    step = 1,
}) => (
    <label className="text-xs text-gray-500 block">
        {label}
        <div className="mt-1 flex items-center gap-2">
            <input
                type="number"
                inputMode="numeric"
                min={0}
                step={step}
                value={Number.isFinite(value) ? value : 0}
                onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800"
            />
            {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
        </div>
    </label>
);

const ProfitReport: React.FC = () => {
    const [month, setMonth] = usePersistentState('lp.month', currentMonthKey());
    const [karyawan, setKaryawan] = usePersistentState('lp.karyawan', 2);
    const [gajiPer, setGajiPer] = usePersistentState('lp.gaji', 700000);
    const [aset, setAset] = usePersistentState('lp.aset', 200000);
    const [lain, setLain] = usePersistentState('lp.lain', 0);
    const [cadanganPct, setCadanganPct] = usePersistentState('lp.cadangan', 10);
    const [partners, setPartners] = usePersistentState('lp.partners', 2);
    const [showSettings, setShowSettings] = useState(false);

    const [stats, setStats] = useState<Record<string, MonthStats>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const nowKey = currentMonthKey();
    const monthOptions = useMemo(() => Array.from({ length: MONTHS_BACK }, (_, i) => shiftMonth(nowKey, -i)), [nowKey]);
    const selected = monthOptions.includes(month) ? month : nowKey;

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const oldest = monthOptions[monthOptions.length - 1];
            const [trx, recipes, profs] = await Promise.all([
                fetchAllTransactions(monthStartISO(oldest), monthStartISO(shiftMonth(nowKey, 1))),
                supabase.from('menu_recipes').select('menu_item_id, quantity_required, ingredients ( price_per_unit )'),
                supabase.from('profiles').select('id, daily_wage'),
            ]);
            if (recipes.error) throw recipes.error;
            const wageOf = new Map<string, number>((profs.data || []).map((p: any) => [p.id, Number(p.daily_wage) || 0]));

            const hppByMenu = new Map<string, number>();
            (recipes.data || []).forEach((r: any) => {
                const ing = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients;
                const cost = (Number(r.quantity_required) || 0) * (Number(ing?.price_per_unit) || 0);
                const k = String(r.menu_item_id);
                hppByMenu.set(k, (hppByMenu.get(k) || 0) + cost);
            });

            const out: Record<string, MonthStats> = {};
            monthOptions.forEach((k) => (out[k] = { key: k, trx: 0, items: 0, omzet: 0, diskon: 0, hpp: 0, hppItemsTanpaResep: 0, gaji: 0, hariKerja: 0, gajiNyata: false }));
            const worked = new Map<string, Set<string>>(); // `${bulan}|${userId}` -> hari masuk (transaksi status apa pun)

            trx.forEach((t) => {
                const s = out[monthKeyOf(t.created_at)];
                if (!s) return;
                if (t.created_by) {
                    const k = `${s.key}|${t.created_by}`;
                    worked.set(k, (worked.get(k) ?? new Set<string>()).add(dayKey(t.created_at)));
                }
                if (t.status !== 'COMPLETED') return;
                s.trx += 1;
                s.omzet += Number(t.total_amount) || 0;
                s.diskon += Number(t.discount_amount) || 0;
                (t.transaction_items || []).forEach((i: any) => {
                    const q = Number(i.quantity) || 0;
                    s.items += q;
                    if (i.is_consignment) {
                        s.hpp += q * (Number(i.consignment_cost) || 0);
                    } else if (i.menu_item_id != null && hppByMenu.has(String(i.menu_item_id))) {
                        s.hpp += q * (hppByMenu.get(String(i.menu_item_id)) || 0);
                    } else {
                        s.hppItemsTanpaResep += q;
                    }
                });
            });
            worked.forEach((days, k) => {
                const [month, uid] = k.split('|');
                const wage = wageOf.get(uid) ?? 0;
                out[month].hariKerja += days.size;
                out[month].gaji += days.size * wage;
            });
            Object.values(out).forEach((m) => (m.gajiNyata = m.gaji > 0));
            setStats(out);
        } catch (e: any) {
            setError(e?.message || 'Gagal memuat data');
        }
        setLoading(false);
    }, [monthOptions, nowKey]);

    useEffect(() => {
        load();
    }, [load]);

    const cur = stats[selected];
    const fixedGaji = karyawan * gajiPer;
    const isCurrentMonth = selected === nowKey;
    const dim = daysInMonth(selected);
    const elapsed = isCurrentMonth ? Math.min(dim, jakartaNow().getUTCDate()) : dim;

    // Satu fungsi untuk semua skenario: omzet & item boleh diproyeksikan, biaya tetap penuh sebulan.
    const calc = useCallback(
        (omzet: number, items: number, hppRatio: number, gaji: number) => {
            const hpp = omzet * hppRatio;
            const labaKotor = omzet - hpp;
            const labaOperasi = labaKotor - gaji - aset - lain;
            const cadangan = Math.max(0, labaOperasi) * (cadanganPct / 100);
            const dibagi = Math.max(0, labaOperasi - cadangan);
            return { omzet, items, hpp, labaKotor, labaOperasi, cadangan, dibagi, perPartner: dibagi / Math.max(1, partners) };
        },
        [aset, lain, cadanganPct, partners]
    );

    const report = useMemo(() => {
        if (!cur || cur.omzet <= 0) return null;
        const hppRatio = cur.hpp / cur.omzet;
        const gajiA = cur.gajiNyata ? cur.gaji : fixedGaji;
        const actual = calc(cur.omzet, cur.items, hppRatio, gajiA);
        let forecast: null | { base: ReturnType<typeof calc>; low: ReturnType<typeof calc>; price: ReturnType<typeof calc> } = null;
        if (isCurrentMonth && elapsed < dim && elapsed > 0) {
            const factor = dim / elapsed;
            const omzetP = cur.omzet * factor;
            const itemsP = cur.items * factor;
            // Naik Rp1.000/item: tambahan omzet murni jadi laba kotor (HPP tidak berubah).
            // Gaji harian ikut bergerak dengan hari masuk; kalau tarif belum diisi, pakai gaji tetap penuh.
            const gajiP = cur.gajiNyata ? cur.gaji * factor : fixedGaji;
            const price = calc(omzetP + itemsP * 1000, itemsP, (omzetP * hppRatio) / (omzetP + itemsP * 1000), gajiP);
            forecast = {
                base: calc(omzetP, itemsP, hppRatio, gajiP),
                low: calc(omzetP * 0.9, itemsP * 0.9, hppRatio, cur.gajiNyata ? gajiP * 0.9 : gajiP),
                price,
            };
        }
        return { hppRatio, actual, forecast };
    }, [cur, calc, isCurrentMonth, elapsed, dim]);

    const trend = useMemo(
        () =>
            monthOptions
                .map((k) => stats[k])
                .filter((s) => s && s.omzet > 0)
                .map((s) => ({ s, r: calc(s.omzet, s.items, s.hpp / s.omzet, s.gajiNyata ? s.gaji : fixedGaji) })),
        [monthOptions, stats, calc, fixedGaji]
    );

    const a = report?.actual;
    const gajiA = cur ? (cur.gajiNyata ? cur.gaji : fixedGaji) : fixedGaji;
    const health = a
        ? [
              { name: 'Biaya bahan (HPP)', value: report!.hppRatio, std: '≤ 35%', st: rate(report!.hppRatio, 0.35, 0.4) },
              { name: 'Gaji karyawan', value: gajiA / a.omzet, std: '≤ 30%', st: rate(gajiA / a.omzet, 0.3, 0.35) },
              {
                  name: 'Bahan + gaji (prime cost)',
                  value: (a.hpp + gajiA) / a.omzet,
                  std: '≤ 60%',
                  st: rate((a.hpp + gajiA) / a.omzet, 0.6, 0.7),
              },
              {
                  name: 'Laba bersih sebelum cadangan',
                  value: a.labaOperasi / a.omzet,
                  std: '≥ 15%',
                  st: (a.labaOperasi / a.omzet >= 0.15 ? 'ok' : a.labaOperasi / a.omzet >= 0.08 ? 'warn' : 'bad') as Status,
              },
          ]
        : [];

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" /> Laporan Laba
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Omzet dari kasir, biaya bahan dari resep. Tanpa input belanja bahan.</p>
                </div>
                <select
                    value={selected}
                    onChange={(e) => setMonth(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700"
                    aria-label="Pilih bulan"
                >
                    {monthOptions.map((k) => (
                        <option key={k} value={k}>
                            {monthLabel(k)}
                            {k === nowKey ? ' (berjalan)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">Gagal memuat data: {error}</div>}

            {loading ? (
                <div className="py-16 flex justify-center">
                    <Loader2 className="animate-spin text-brewasa-copper" />
                </div>
            ) : !report || !a ? (
                <p className="p-8 text-center text-sm text-gray-400 bg-white border border-gray-100 rounded-xl">Belum ada penjualan selesai di bulan ini.</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card label="Omzet bersih" value={rupiah(a.omzet)} sub={`${cur!.trx} transaksi • ${cur!.items} item`} />
                        <Card label="Laba kotor" value={rupiah(a.labaKotor)} sub={`margin ${pct(a.labaKotor / a.omzet)}`} />
                        <Card label="Laba bersih" value={rupiah(a.labaOperasi)} sub={`margin ${pct(a.labaOperasi / a.omzet)}`} tone={a.labaOperasi >= 0 ? 'good' : 'bad'} />
                        <Card label="Per partner" value={rupiah(a.perPartner)} sub={`setelah cadangan ${cadanganPct}%`} tone={a.perPartner > 0 ? 'good' : 'bad'} />
                    </div>

                    {isCurrentMonth && elapsed < dim && (
                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                            Bulan masih jalan ({elapsed} dari {dim} hari). Gaji & aset dihitung penuh sebulan, jadi angka di atas sengaja terlihat kecil. Lihat prediksi di bawah.
                        </p>
                    )}

                    {/* Rincian */}
                    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 font-bold text-brewasa-dark">Rincian {monthLabel(selected)}</div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-100">
                                <Row label="Omzet bersih (setelah diskon)" value={rupiah(a.omzet)} bold />
                                <Row label={`Biaya bahan dari resep (${pct(report.hppRatio)})`} value={`- ${rupiah(a.hpp)}`} />
                                <Row label="Laba kotor" value={rupiah(a.labaKotor)} bold />
                                <Row label={cur!.gajiNyata ? `Gaji (${cur!.hariKerja} hari masuk × tarif harian)` : `Gaji ${karyawan} karyawan (asumsi tetap)`} value={`- ${rupiah(gajiA)}`} />
                                <Row label="Aset / penyusutan alat" value={`- ${rupiah(aset)}`} />
                                <Row label="Biaya lain" value={`- ${rupiah(lain)}`} />
                                <Row label="Laba bersih" value={rupiah(a.labaOperasi)} bold />
                                <Row label={`Dana cadangan (${cadanganPct}%)`} value={`- ${rupiah(a.cadangan)}`} />
                                <Row label={`Dibagi ${partners} partner`} value={rupiah(a.dibagi)} bold />
                            </tbody>
                        </table>
                        <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                            {cur!.gajiNyata
                                ? 'Gaji dihitung dari hari masuk (ada transaksi) × tarif per hari. Atur tarif di Kinerja Karyawan.'
                                : 'Tarif harian belum diisi, jadi gaji memakai asumsi tetap di bawah. Isi tarif di Kinerja Karyawan agar gaji mengikuti hari masuk.'}
                        </p>
                        {cur!.diskon > 0 && <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">Diskon/voucher bulan ini: {rupiah(cur!.diskon)} (sudah dikurangi dari omzet).</p>}
                        {cur!.hppItemsTanpaResep > 0 && (
                            <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                                {cur!.hppItemsTanpaResep} item terjual belum punya resep, jadi biayanya dihitung Rp0. Lengkapi resep di menu Menu supaya akurat.
                            </p>
                        )}
                    </section>

                    {/* Prediksi */}
                    {report.forecast && (
                        <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="font-bold text-brewasa-dark">Prediksi akhir bulan</h3>
                                <p className="text-xs text-gray-500">Tren penjualan {elapsed} hari pertama dilanjutkan sampai tanggal {dim}. Gaji & aset penuh sebulan.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[520px]">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="p-3 text-left font-semibold"></th>
                                            <th className="p-3 text-right font-semibold">Hati-hati (−10%)</th>
                                            <th className="p-3 text-right font-semibold">Realistis</th>
                                            <th className="p-3 text-right font-semibold">Harga +Rp1.000</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 tabular-nums">
                                        {(
                                            [
                                                ['Omzet', (x: ReturnType<typeof calc>) => rupiah(x.omzet)],
                                                ['Laba bersih', (x: ReturnType<typeof calc>) => rupiah(x.labaOperasi)],
                                                ['Cadangan', (x: ReturnType<typeof calc>) => rupiah(x.cadangan)],
                                                ['Masing-masing partner', (x: ReturnType<typeof calc>) => rupiah(x.perPartner)],
                                            ] as const
                                        ).map(([label, fn], idx) => (
                                            <tr key={label} className={idx === 3 ? 'bg-brewasa-copper/5 font-bold' : ''}>
                                                <td className="p-3 text-gray-700">{label}</td>
                                                <td className="p-3 text-right">{fn(report.forecast!.low)}</td>
                                                <td className="p-3 text-right">{fn(report.forecast!.base)}</td>
                                                <td className="p-3 text-right">{fn(report.forecast!.price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                                Prediksi kasar dan memakai rata-rata per hari dari awal bulan. Kolom harga mengandaikan jumlah item terjual tetap walau harga naik, padahal bisa turun.
                            </p>
                        </section>
                    )}

                    {/* Kesehatan */}
                    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-brewasa-dark">Sehat nggak dibanding kedai kopi umumnya?</h3>
                            <p className="text-xs text-gray-500">Patokan umum, bukan aturan pasti.</p>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {health.map((h) => (
                                <li key={h.name} className="px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800">{h.name}</p>
                                        <p className="text-xs text-gray-500">Standar {h.std}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold tabular-nums text-brewasa-dark">{pct(h.value)}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[h.st].cls}`}>{STATUS_STYLE[h.st].label}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Tren */}
                    {trend.length > 1 && (
                        <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 font-bold text-brewasa-dark">Tren bulanan</div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[520px]">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="p-3 text-left font-semibold">Bulan</th>
                                            <th className="p-3 text-right font-semibold">Omzet</th>
                                            <th className="p-3 text-right font-semibold">Item</th>
                                            <th className="p-3 text-right font-semibold">Bahan</th>
                                            <th className="p-3 text-right font-semibold">Laba bersih</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 tabular-nums">
                                        {trend.map(({ s, r }) => (
                                            <tr key={s.key} className={s.key === selected ? 'bg-brewasa-copper/5' : ''}>
                                                <td className="p-3 text-gray-700">
                                                    {monthLabel(s.key)}
                                                    {s.key === nowKey ? ' *' : ''}
                                                </td>
                                                <td className="p-3 text-right">{rupiah(s.omzet)}</td>
                                                <td className="p-3 text-right">{s.items}</td>
                                                <td className="p-3 text-right">{pct(s.hpp / s.omzet)}</td>
                                                <td className={`p-3 text-right font-semibold ${r.labaOperasi < 0 ? 'text-red-600' : ''}`}>{rupiah(r.labaOperasi)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                                * bulan berjalan, belum penuh. Biaya bahan memakai resep dan harga bahan saat ini, jadi bulan lama hanya perkiraan. Sebelum akhir Agustus toko Brewasa beda lokasi.
                            </p>
                        </section>
                    )}
                </>
            )}

            {/* Asumsi */}
            <section className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <button onClick={() => setShowSettings((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between font-bold text-brewasa-dark">
                    <span className="flex items-center gap-2">
                        <Info className="w-4 h-4" /> Asumsi biaya
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </button>
                {showSettings && (
                    <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                        <NumberField label="Jumlah karyawan (asumsi bila tarif harian kosong)" value={karyawan} onChange={setKaryawan} />
                        <NumberField label="Gaji tetap per karyawan / bulan (asumsi)" value={gajiPer} onChange={setGajiPer} step={50000} suffix="Rp" />
                        <NumberField label="Aset / penyusutan / bulan" value={aset} onChange={setAset} step={50000} suffix="Rp" />
                        <NumberField label="Biaya lain / bulan" value={lain} onChange={setLain} step={10000} suffix="Rp" />
                        <NumberField label="Dana cadangan dari laba" value={cadanganPct} onChange={(n) => setCadanganPct(Math.min(100, n))} suffix="%" />
                        <NumberField label="Jumlah partner (bagi rata)" value={partners} onChange={(n) => setPartners(Math.max(1, n))} />
                    </div>
                )}
            </section>
        </div>
    );
};

const Card: React.FC<{ label: string; value: string; sub?: string; tone?: 'good' | 'bad' }> = ({ label, value, sub, tone }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`mt-1 text-lg md:text-xl font-bold break-words ${tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-green-700' : 'text-brewasa-dark'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
);

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
    <tr className={bold ? 'bg-gray-50 font-bold' : ''}>
        <td className="p-3 text-gray-700">{label}</td>
        <td className="p-3 text-right tabular-nums">{value}</td>
    </tr>
);

export default ProfitReport;
