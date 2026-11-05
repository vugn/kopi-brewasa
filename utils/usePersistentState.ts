import { useEffect, useRef, useState } from 'react';

const PREFIX = 'brewasa-admin:';

/**
 * useState yang disimpan di localStorage.
 * Dipakai untuk filter/tab admin supaya tidak reset waktu browser HP membuang
 * halaman dari memori (balik dari "recent apps") atau saat halaman di-refresh.
 */
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const storageKey = PREFIX + key;

    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw !== null) return JSON.parse(raw) as T;
        } catch {
            /* storage tidak tersedia / rusak -> pakai default */
        }
        return initial;
    });

    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            /* abaikan */
        }
    }, [storageKey, value]);

    return [value, setValue];
}

/** Hapus semua preferensi tersimpan untuk prefix tertentu (dipakai tombol "Reset filter"). */
export const clearPersisted = (...keys: string[]) => {
    try {
        keys.forEach((k) => localStorage.removeItem(PREFIX + k));
    } catch {
        /* abaikan */
    }
};
