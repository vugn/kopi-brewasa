// Hari kerja Brewasa: zona waktu WITA (UTC+8), hari baru mulai jam 07:00.
// Transaksi sebelum 07:00 WITA dihitung ke hari sebelumnya. Dipakai Kinerja Karyawan & Laporan Laba.
export const TZ_OFFSET_HOURS = 8;
export const DAY_START_HOUR = 7;

const SHIFT_MS = (TZ_OFFSET_HOURS - DAY_START_HOUR) * 60 * 60 * 1000;
const hh = String(DAY_START_HOUR).padStart(2, '0');
const tz = `+${String(TZ_OFFSET_HOURS).padStart(2, '0')}:00`;

/** Kunci hari kerja 'YYYY-MM-DD' untuk sebuah waktu. */
export const dayKey = (value: string | number | Date) => new Date(new Date(value).getTime() + SHIFT_MS).toISOString().slice(0, 10);
export const todayKey = () => dayKey(Date.now());
export const shiftDay = (key: string, n: number) => {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
export const weekStartKey = (key: string) => shiftDay(key, -new Date(`${key}T00:00:00Z`).getUTCDay()); // Minggu
export const monthStartKey = (key: string) => `${key.slice(0, 8)}01`;
/** Awal hari kerja (07:00 WITA) sebagai ISO UTC. */
export const dayStartISO = (key: string) => new Date(`${key}T${hh}:00:00${tz}`).toISOString();
export const formatDay = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', ...opts });
