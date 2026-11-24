// Bagi hasil dinamis: mitra lokasi (boleh banyak/kosong, ada masa berlaku) dan porsi pemilik.
export interface Mitra {
    id: string;
    name: string;
    basis: 'LABA' | 'OMZET';
    percent: number;
    min_monthly: number;
    start_date: string; // YYYY-MM-DD
    end_date: string | null;
    note?: string | null;
}
export interface Owner {
    id: string;
    name: string;
    share_pct: number;
    sort_order: number;
}

// Dipakai bila tabel belum ada di database; sama dengan nilai awal migration.
export const DEFAULT_MITRA: Mitra[] = [
    { id: 'default-its', name: 'ITS', basis: 'LABA', percent: 15, min_monthly: 0, start_date: '2026-08-25', end_date: null },
];
export const DEFAULT_OWNERS: Owner[] = [
    { id: 'default-o1', name: 'Gusti', share_pct: 50, sort_order: 1 },
    { id: 'default-o2', name: 'Rizan', share_pct: 50, sort_order: 2 },
];

const pad = (n: number) => String(n).padStart(2, '0');
const dayNum = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
};
const daysInMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export interface MitraShare {
    mitra: Mitra;
    fraction: number; // bagian bulan yang tercakup perjanjian (0..1), proporsional hari
    amount: number;
    floorApplied: boolean; // true bila minimal bulanan yang dipakai, bukan persen
}

/**
 * Bagian tiap mitra untuk satu bulan. Perjanjian yang mulai/berakhir di tengah bulan dihitung
 * proporsional hari (perkiraan). `minScale` mengecilkan minimal bulanan untuk bulan yang belum selesai.
 */
export function mitraShares(list: Mitra[], month: string, base: { laba: number; omzet: number }, minScale = 1): MitraShare[] {
    const dim = daysInMonth(month);
    const ms = `${month}-01`;
    const me = `${month}-${pad(dim)}`;
    const out: MitraShare[] = [];
    for (const m of list) {
        const from = m.start_date > ms ? m.start_date : ms;
        const to = m.end_date && m.end_date < me ? m.end_date : me;
        if (to < from) continue;
        const fraction = (dayNum(to) - dayNum(from) + 1) / dim;
        const basis = m.basis === 'OMZET' ? base.omzet : base.laba;
        const byPercent = Math.max(0, basis) * (m.percent / 100) * fraction;
        const floor = m.min_monthly * fraction * minScale;
        out.push({ mitra: m, fraction, amount: Math.max(byPercent, floor), floorApplied: floor > byPercent });
    }
    return out;
}

/** Bagi `pool` ke pemilik sesuai porsi; porsi dinormalkan (jumlahnya tak harus tepat 100). */
export function splitOwners(pool: number, owners: Owner[]): { owner: Owner; amount: number }[] {
    const total = owners.reduce((s, o) => s + o.share_pct, 0);
    if (total <= 0) return owners.map((owner) => ({ owner, amount: 0 }));
    return owners.map((owner) => ({ owner, amount: (pool * owner.share_pct) / total }));
}
