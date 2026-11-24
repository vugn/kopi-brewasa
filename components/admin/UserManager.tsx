import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient';
import { usernameToEmail, type UserRole } from '../../context/AuthContext';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';

interface ProfileRow {
    id: string;
    username: string;
    full_name: string | null;
    role: UserRole;
    created_at?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Client helper tanpa persist session -> bikin user baru tidak menendang sesi admin.
const helperClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<ProfileRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('karyawan');
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, role, created_at')
            .order('created_at', { ascending: false });
        if (error) {
            alert('Gagal memuat user: ' + error.message + '\nPastikan migrasi profiles sudah dijalankan di Supabase SQL Editor.');
        } else {
            setUsers((data || []) as ProfileRow[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = username.trim().toLowerCase().replace(/\s+/g, '');
        if (!clean) {
            alert('Username wajib diisi.');
            return;
        }
        if (!password || password.length < 6) {
            alert('Password minimal 6 karakter.');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await helperClient.auth.signUp({
                email: usernameToEmail(clean),
                password,
            });
            if (error) throw error;

            const userId = data.user?.id;
            if (!userId) {
                throw new Error('User auth tidak kembali. Matikan "Confirm email" di Supabase Auth settings.');
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ id: userId, username: clean, full_name: fullName.trim() || null, role }, { onConflict: 'id' });
            if (profileError) throw profileError;

            setUsername('');
            setPassword('');
            setFullName('');
            setRole('karyawan');
            await fetchUsers();
            alert(`User "${clean}" (${role}) berhasil dibuat. Login pakai username + password itu.`);
        } catch (err: any) {
            alert('Gagal bikin user: ' + err.message);
        }
        setSubmitting(false);
    };

    const handleRoleChange = async (id: string, newRole: UserRole) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
        if (error) {
            alert('Gagal update role: ' + error.message);
        } else {
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
        }
    };

    const handleNameSave = async (row: ProfileRow, value: string) => {
        const next = value.trim() || null;
        if (next === (row.full_name ?? null)) return;
        const { error } = await supabase.from('profiles').update({ full_name: next }).eq('id', row.id);
        if (error) {
            alert('Gagal simpan nama: ' + error.message);
        } else {
            setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, full_name: next } : u)));
        }
    };

    const handleDelete = async (row: ProfileRow) => {
        if (!window.confirm(`Hapus "${row.username}" dari daftar? Akun auth-nya harus dihapus manual via Supabase Dashboard.`)) return;
        const { error } = await supabase.from('profiles').delete().eq('id', row.id);
        if (error) {
            alert('Gagal hapus: ' + error.message);
        } else {
            setUsers((prev) => prev.filter((u) => u.id !== row.id));
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                <UserPlus className="w-6 h-6" /> Kelola User
            </h2>

            <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm space-y-4 max-w-xl">
                <h3 className="font-bold text-brewasa-dark">Tambah User Baru</h3>
                <div className="grid md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-600">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="cth: budi"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            required
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Login pakai username ini (tanpa @...).</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="min. 6 karakter"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">Nama asli (opsional)</label>
                    <input
                        type="text"
                        value={fullName}
                        maxLength={100}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="cth: Budi Santoso"
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Hanya terlihat oleh admin, untuk membedakan orangnya.</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                    >
                        <option value="karyawan">Karyawan (kasir saja)</option>
                        <option value="admin">Admin (full akses)</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-brewasa-dark text-white font-bold hover:bg-brewasa-copper disabled:opacity-50"
                >
                    {submitting ? 'Membuat...' : 'Buat User'}
                </button>
            </form>

            <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm">
                <h3 className="font-bold text-brewasa-dark mb-3">Daftar User</h3>
                {loading ? (
                    <div className="p-6 text-center flex justify-center"><Loader2 className="animate-spin text-brewasa-copper" /></div>
                ) : users.length === 0 ? (
                    <p className="text-sm text-gray-400">Belum ada user. Jalankan migrasi profiles dulu kalau tabel belum ada.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {users.map((u) => (
                            <div key={u.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-800 text-sm">{u.username}</p>
                                    <input
                                        key={`${u.id}:${u.full_name ?? ''}`}
                                        type="text"
                                        defaultValue={u.full_name ?? ''}
                                        maxLength={100}
                                        placeholder="Nama asli (klik untuk isi)"
                                        onBlur={(e) => handleNameSave(u, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        className="mt-1 w-full sm:w-56 px-2 py-1 rounded-md border border-transparent hover:border-gray-200 focus:border-gray-300 text-sm text-gray-700 bg-transparent"
                                    />
                                    <p className="text-[11px] text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={u.role}
                                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
                                    >
                                        <option value="karyawan">karyawan</option>
                                        <option value="admin">admin</option>
                                    </select>
                                    <button
                                        onClick={() => handleDelete(u)}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                                        title="Hapus user"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManager;
