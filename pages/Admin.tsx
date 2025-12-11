import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock } from 'lucide-react';
import MenuManager from '../components/admin/MenuManager';
import StoryModerator from '../components/admin/StoryModerator';
import AnnouncementManager from '../components/admin/AnnouncementManager';
import PosSystem from '../components/admin/PosSystem';
import TransactionHistory from '../components/admin/TransactionHistory';

const Admin: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('menu');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        console.log("Attempting login with:", email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        console.log("Login result:", { data, error });

        if (error) {
            console.error("Login error:", error);
            setMessage('Error: ' + error.message);
        } else if (data.session) {
            setSession(data.session); // Manual update just in case
        } else {
            console.warn("Login success but no session returned?", data);
            setMessage('Login berhasil tapi sesi tidak ditemukan. Coba refresh.');
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!session) {
        return (
            <div className="min-h-screen bg-[#F7E9D3] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-brewasa-dark/10">
                    <div className="text-center mb-8">
                        <Lock className="w-12 h-12 text-brewasa-dark mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-brewasa-dark">Admin Login</h1>
                        <p className="text-brewasa-dark/60 mt-2">Masuk untuk mengelola Kopi Brewasa</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brewasa-dark mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                                placeholder="admin@brewasa.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brewasa-dark mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                                placeholder="••••••••"
                            />
                        </div>

                        {message && <p className="text-sm text-center text-red-500 font-medium">{message}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-brewasa-dark text-white rounded-xl font-bold hover:bg-brewasa-copper transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Memproses...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-brewasa-dark text-white p-6 hidden md:block fixed h-full z-10">
                <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <Lock className="w-5 h-5" /> Admin
                </h2>
                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'pos' ? 'bg-brewasa-copper text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        Mode Kasir (POS)
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'history' ? 'bg-brewasa-copper text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        Riwayat Transaksi
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'menu' ? 'bg-brewasa-copper text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        Menu Manager
                    </button>
                    <button
                        onClick={() => setActiveTab('stories')}
                        className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'stories' ? 'bg-brewasa-copper text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        Story Moderation
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'announcements' ? 'bg-brewasa-copper text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        Announcements
                    </button>
                </nav>
                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={handleLogout}
                        className="w-full py-2 border border-red-800 text-red-300 rounded hover:bg-red-900/50 transition-colors text-sm"
                    >
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 md:ml-64 bg-gray-50 min-h-screen">
                {activeTab === 'pos' && <PosSystem />}
                {activeTab === 'history' && <TransactionHistory />}
                {activeTab === 'menu' && <MenuManager />}
                {activeTab === 'stories' && <StoryModerator />}
                {activeTab === 'announcements' && <AnnouncementManager />}
            </main>
        </div>
    );
};

export default Admin;
