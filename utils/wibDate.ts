// Hari kalender WIB (UTC+7) sebagai kunci 'YYYY-MM-DD'. Dipakai supaya "hari ini" = hari kalender di Indonesia,
// bukan zona waktu perangkat atau jam buka.
const WIB_MS = 7 * 60 * 60 * 1000;

export const dayKey = (value: string | number | Date) => new Date(new Date(value).getTime() + WIB_MS).toISOString().slice(0, 10);
export const todayKey = () => dayKey(Date.now());
export const shiftDay = (key: string, n: number) => {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
export const weekStartKey = (key: string) => shiftDay(key, -new Date(`${key}T00:00:00Z`).getUTCDay()); // Minggu
export const monthStartKey = (key: string) => `${key.slice(0, 8)}01`;
export const dayStartISO = (key: string) => new Date(`${key}T00:00:00+07:00`).toISOString();
export const formatDay = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', ...opts });
