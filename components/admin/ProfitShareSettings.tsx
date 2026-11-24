import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { todayKey } from '../../utils/bizDay';
import type { Mitra, Owner } from '../../utils/profitShare';

interface Props {
    mitras: Mitra[];
    owners: Owner[];
    usingDefaults: boolean; // tabel belum ada di database -> tampil nilai bawaan, tidak bisa diubah
    reload: () => void;
}

type Table = 'location_partners' | 'owner_shares';

const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white';
const num = (v: string) => {
    const n = Number(v.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
};

const ProfitShareSettings: React.FC<Props> = ({ mitras, owners, usingDefaults, reload }) => {
    const today = todayKey();

    const update = async (table: Table, id: string, patch: Record<string, unknown>) => {
        const { error } = await supabase.from(table).update(patch).eq('id', id);
        if (error) alert('Gagal menyimpan: ' + error.message);
        reload();
    };
    const remove = async (table: Table, id: string, label: string) => {
        if (!window.confirm(`Hapus ${label}? Bulan-bulan lama ikut berubah karena memakai pengaturan ini. Untuk mitra yang sudah berhenti, lebih baik pakai "Akhiri".`)) return;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) alert('Gagal menghapus: ' + error.message);
        reload();
    };
    const addMitra = async () => {
        const { error } = await supabase.from('location_partners').insert({ name: 'Mitra baru', percent: 15, basis: 'LABA', min_monthly: 0, start_date: today });
        if (error) alert('Gagal menambah: ' + error.message);
        reload();
    };
    const addOwner = async () => {
        const { error } = await supabase.from('owner_shares').insert({ name: 'Pemilik baru', share_pct: 0, sort_order: owners.length + 1 });
        if (error) alert('Gagal menambah: ' + error.message);
        reload();
    };

    const ownerTotal = owners.reduce((s, o) => s + o.share_pct, 0);
    const status = (m: Mitra) => (m.start_date > today ? 'Akan mulai' : m.end_date && m.end_date < today ? 'Berakhir' : 'Aktif');
    const statusCls = (st: string) => (st === 'Aktif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200');

    return (
        <section className="bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-brewasa-dark">Mitra lokasi & porsi pemilik</h3>
                <p className="text-xs text-gray-500">
                    Bagian mitra dihitung per bulan sesuai masa berlakunya, jadi pindah lokasi atau ganti mitra tidak mengubah bulan lama. Boleh tanpa mitra.
                </p>
            </div>

            {usingDefaults && (
                <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
                    Tabel pengaturan belum ada di database, jadi memakai nilai bawaan (ITS 15%, Gusti/Rizan 50-50) dan belum bisa diubah. Jalankan migration terbaru.
                </p>
            )}

            <div className="p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Mitra lokasi</p>
                {mitras.length === 0 && <p className="text-sm text-gray-400">Belum ada mitra. Semua laba usaha dibagi ke pemilik.</p>}
                {mitras.map((m) => {
                    const st = status(m);
                    return (
                        <div key={m.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <input
                                    key={`n-${m.id}-${m.name}`}
                                    defaultValue={m.name}
                                    maxLength={60}
                                    disabled={usingDefaults}
                                    onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== m.name && update('location_partners', m.id, { name: e.target.value.trim() })}
                                    className={`${inputCls} flex-1 min-w-[8rem] font-semibold`}
                                    aria-label="Nama mitra"
                                />
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${statusCls(st)}`}>{st}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <label className="text-xs text-gray-500">
                                    Persen
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            key={`p-${m.id}-${m.percent}`}
                                            defaultValue={m.percent}
                                            inputMode="decimal"
                                            disabled={usingDefaults}
                                            onBlur={(e) => {
                                                const v = Math.min(100, Math.max(0, num(e.target.value)));
                                                if (v !== m.percent) update('location_partners', m.id, { percent: v });
                                            }}
                                            className={inputCls}
                                        />
                                        <span className="text-sm text-gray-500">%</span>
                                    </div>
                                </label>
                                <label className="text-xs text-gray-500">
                                    Dari
                                    <select
                                        value={m.basis}
                                        disabled={usingDefaults}
                                        onChange={(e) => update('location_partners', m.id, { basis: e.target.value })}
                                        className={`${inputCls} mt-1`}
                                    >
                                        <option value="LABA">Laba usaha</option>
                                        <option value="OMZET">Omzet</option>
                                    </select>
                                </label>
                                <label className="text-xs text-gray-500">
                                    Minimal / bulan (Rp)
                                    <input
                                        key={`m-${m.id}-${m.min_monthly}`}
                                        defaultValue={m.min_monthly || ''}
                                        placeholder="0"
                                        inputMode="numeric"
                                        disabled={usingDefaults}
                                        onBlur={(e) => {
                                            const v = Math.max(0, Math.round(num(e.target.value)));
                                            if (v !== m.min_monthly) update('location_partners', m.id, { min_monthly: v });
                                        }}
                                        className={`${inputCls} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-gray-500">
                                    Mulai
                                    <input
                                        type="date"
                                        value={m.start_date}
                                        disabled={usingDefaults}
                                        onChange={(e) => e.target.value && update('location_partners', m.id, { start_date: e.target.value })}
                                        className={`${inputCls} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-gray-500">
                                    Berakhir (kosong = berjalan)
                                    <input
                                        type="date"
                                        value={m.end_date ?? ''}
                                        disabled={usingDefaults}
                                        onChange={(e) => update('location_partners', m.id, { end_date: e.target.value || null })}
                                        className={`${inputCls} mt-1`}
                                    />
                                </label>
                            </div>
                            {!usingDefaults && (
                                <div className="flex gap-2">
                                    {(!m.end_date || m.end_date > today) && (
                                        <button
                                            onClick={() => update('location_partners', m.id, { end_date: today < m.start_date ? m.start_date : today })}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                        >
                                            Akhiri hari ini
                                        </button>
                                    )}
                                    <button
                                        onClick={() => remove('location_partners', m.id, `mitra "${m.name}"`)}
                                        className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {!usingDefaults && (
                    <button onClick={addMitra} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        <Plus className="w-4 h-4" /> Tambah mitra
                    </button>
                )}
            </div>

            <div className="p-4 space-y-3 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Porsi pemilik (dari sisa setelah mitra)</p>
                {owners.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                        <input
                            key={`on-${o.id}-${o.name}`}
                            defaultValue={o.name}
                            maxLength={60}
                            disabled={usingDefaults}
                            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== o.name && update('owner_shares', o.id, { name: e.target.value.trim() })}
                            className={`${inputCls} flex-1`}
                            aria-label="Nama pemilik"
                        />
                        <input
                            key={`os-${o.id}-${o.share_pct}`}
                            defaultValue={o.share_pct}
                            inputMode="decimal"
                            disabled={usingDefaults}
                            onBlur={(e) => {
                                const v = Math.min(100, Math.max(0, num(e.target.value)));
                                if (v !== o.share_pct) update('owner_shares', o.id, { share_pct: v });
                            }}
                            className={`${inputCls} w-20 text-right`}
                            aria-label="Porsi persen"
                        />
                        <span className="text-sm text-gray-500">%</span>
                        {!usingDefaults && (
                            <button onClick={() => remove('owner_shares', o.id, `pemilik "${o.name}"`)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Hapus pemilik">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                {owners.length === 0 && <p className="text-sm text-gray-400">Belum ada pemilik.</p>}
                {owners.length > 0 && ownerTotal !== 100 && (
                    <p className="text-xs text-amber-700">Jumlah porsi {ownerTotal}%, bukan 100%. Pembagian tetap dinormalkan agar total sama dengan sisa yang dibagi.</p>
                )}
                {!usingDefaults && (
                    <button onClick={addOwner} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        <Plus className="w-4 h-4" /> Tambah pemilik
                    </button>
                )}
            </div>
        </section>
    );
};

export default ProfitShareSettings;
