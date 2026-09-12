import React, { useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import MenuManager from '../components/admin/MenuManager';
import StoryModerator from '../components/admin/StoryModerator';
import AnnouncementManager from '../components/admin/AnnouncementManager';
import PosSystem from '../components/admin/PosSystem';
import TransactionHistory from '../components/admin/TransactionHistory';
import InventoryManager from '../components/admin/InventoryManager';
import CostingManager from '../components/admin/CostingManager';
import ExportManager from '../components/admin/ExportManager';
import NotesManager from '../components/admin/NotesManager';
import FinanceManager from '../components/admin/FinanceManager';
import TopSpenders from '../components/admin/TopSpenders';
import UserManager from '../components/admin/UserManager';
import { AuthProvider, useAuth, type UserRole } from '../context/AuthContext';

interface TabDef {
    id: string;
    label: string;
    roles: UserRole[];
}

const ALL_TABS: TabDef[] = [
    { id: 'pos', label: 'Mode Kasir (POS)', roles: ['admin', 'karyawan'] },
    { id: 'history', label: 'Riwayat Transaksi', roles: ['admin', 'karyawan'] },
    { id: 'finance', label: 'Keuangan', roles: ['admin'] },
    { id: 'menu', label: 'Menu Manager', roles: ['admin'] },
    { id: 'stories', label: 'Story Moderation', roles: ['admin'] },
    { id: 'announcements', label: 'Announcements', roles: ['admin'] },
    { id: 'notes', label: 'Catatan / Notes', roles: ['admin'] },
    { id: 'top-spenders', label: 'Pelanggan Setia', roles: ['admin'] },
    { id: 'inventory', label: 'Inventory & Stok', roles: ['admin'] },
    { id: 'costing', label: 'HPP & Costing', roles: ['admin'] },
    { id: 'exports', label: 'Export Data', roles: ['admin'] },
    { id: 'users', label: 'Kelola User', roles: ['admin'] },
];

const LoginForm: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await login(username, password);

        if (error) {
            setMessage('Error: ' + error);
        }
        setLoading(false);
    };

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
                        <label className="block text-sm font-medium text-brewasa-dark mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                            placeholder="username (cth: budi)"
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
};

const AdminInner: React.FC = () => {
    const { session, profile, role, isAdmin, isKaryawan, loadingProfile, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('pos');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!session) {
        return <LoginForm />;
    }

    if (loadingProfile || !role) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-brewasa-dark font-medium">Memuat profil...</p>
            </div>
        );
    }

    const visibleTabs = ALL_TABS.filter((t) => t.roles.includes(role));
    const safeTab = visibleTabs.some((t) => t.id === activeTab) ? activeTab : 'pos';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-brewasa-dark text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <h2 className="font-bold flex items-center gap-2">
                    <Lock className="w-5 h-5" /> Admin
                </h2>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-20 w-64 bg-brewasa-dark text-white p-6 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block shadow-xl
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Lock className="w-5 h-5" /> Admin Panel
                    </h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                    {profile?.username} • <span className={`font-bold ${isKaryawan ? 'text-amber-300' : 'text-green-300'}`}>{role}</span>
                </p>

                <nav className="space-y-2">
                    {visibleTabs.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`block w-full text-left py-3 px-4 rounded-lg font-medium transition-colors ${safeTab === item.id ? 'bg-brewasa-copper text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={logout}
                        className="w-full py-2 border border-red-800 text-red-300 rounded hover:bg-red-900/50 transition-colors text-sm"
                    >
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 bg-gray-50 min-h-screen overflow-y-auto w-full">
                {safeTab === 'pos' && <PosSystem />}
                {safeTab === 'history' && <TransactionHistory isAdmin={isAdmin} />}
                {safeTab === 'finance' && <FinanceManager />}
                {safeTab === 'menu' && <MenuManager />}
                {safeTab === 'stories' && <StoryModerator />}
                {safeTab === 'announcements' && <AnnouncementManager />}
                {safeTab === 'notes' && <NotesManager />}
                {safeTab === 'top-spenders' && <TopSpenders />}
                {safeTab === 'inventory' && <InventoryManager />}
                {safeTab === 'costing' && <CostingManager />}
                {safeTab === 'exports' && <ExportManager />}
                {safeTab === 'users' && <UserManager />}
            </main>
        </div>
    );
};

const Admin: React.FC = () => {
    return (
        <AuthProvider>
            <AdminInner />
        </AuthProvider>
    );
};

export default Admin;
