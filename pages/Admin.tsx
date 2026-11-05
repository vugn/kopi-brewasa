import React, { useState } from 'react';
import {
    Activity, Calculator, Crown, Download, LogOut, Lock, Megaphone, Menu, MessageSquare, Package,
    Receipt, ShoppingCart, StickyNote, UserCog, UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import { usePersistentState } from '../utils/usePersistentState';
import EmployeePerformance from '../components/admin/EmployeePerformance';
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
    icon: React.ComponentType<{ className?: string }>;
    roles: UserRole[];
}

interface TabGroup {
    title: string;
    tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
    {
        title: 'Operasional',
        tabs: [
            { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart, roles: ['admin', 'karyawan'] },
            { id: 'history', label: 'Riwayat Transaksi', icon: Receipt, roles: ['admin', 'karyawan'] },
        ],
    },
    {
        title: 'Laporan',
        tabs: [
            { id: 'finance', label: 'Keuangan', icon: Wallet, roles: ['admin'] },
            { id: 'performance', label: 'Kinerja Karyawan', icon: Activity, roles: ['admin'] },
            { id: 'top-spenders', label: 'Pelanggan Setia', icon: Crown, roles: ['admin'] },
            { id: 'exports', label: 'Export Data', icon: Download, roles: ['admin'] },
        ],
    },
    {
        title: 'Produk & Stok',
        tabs: [
            { id: 'menu', label: 'Menu', icon: UtensilsCrossed, roles: ['admin'] },
            { id: 'inventory', label: 'Inventory & Stok', icon: Package, roles: ['admin'] },
            { id: 'costing', label: 'HPP & Costing', icon: Calculator, roles: ['admin'] },
        ],
    },
    {
        title: 'Konten & Pengaturan',
        tabs: [
            { id: 'stories', label: 'Moderasi Cerita', icon: MessageSquare, roles: ['admin'] },
            { id: 'announcements', label: 'Pengumuman', icon: Megaphone, roles: ['admin'] },
            { id: 'notes', label: 'Catatan', icon: StickyNote, roles: ['admin'] },
            { id: 'users', label: 'Kelola User', icon: UserCog, roles: ['admin'] },
        ],
    },
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
    // Disimpan di localStorage: balik dari "recent apps" / refresh tetap di halaman yang sama.
    const [activeTab, setActiveTab] = usePersistentState('tab', 'pos');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Layar "Memuat profil" hanya untuk muat pertama. Setelah profil ada, jangan pernah
    // meng-unmount panel (itu yang bikin filter ke-reset sebelumnya).
    if (!session) {
        return <LoginForm />;
    }

    if (!profile || !role) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-brewasa-dark font-medium">{loadingProfile ? 'Memuat profil...' : 'Profil tidak ditemukan.'}</p>
            </div>
        );
    }

    const groups = TAB_GROUPS
        .map((g) => ({ ...g, tabs: g.tabs.filter((t) => t.roles.includes(role)) }))
        .filter((g) => g.tabs.length > 0);
    const visibleTabs = groups.flatMap((g) => g.tabs);
    const current = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0];
    const safeTab = current.id;

    const selectTab = (id: string) => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
        window.scrollTo({ top: 0 });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden bg-brewasa-dark text-white px-4 h-14 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                    <current.icon className="w-5 h-5 shrink-0" />
                    <h1 className="font-bold truncate">{current.label}</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 -mr-2"
                    aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* Sidebar */}
            <aside
                className={`
                fixed inset-y-0 left-0 z-40 w-72 md:w-64 bg-brewasa-dark text-white flex flex-col transition-transform duration-300 ease-in-out
                md:translate-x-0 md:sticky md:top-0 md:h-screen md:shrink-0 shadow-xl
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            >
                <div className="p-5 pb-4 border-b border-white/10 flex items-start justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Lock className="w-5 h-5" /> Brewasa Admin
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                            {profile.username} •{' '}
                            <span className={`font-bold ${isKaryawan ? 'text-amber-300' : 'text-green-300'}`}>{role}</span>
                        </p>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-white" aria-label="Tutup menu">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-5">
                    {groups.map((group) => (
                        <div key={group.title}>
                            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">{group.title}</p>
                            <div className="space-y-1">
                                {group.tabs.map((item) => {
                                    const Icon = item.icon;
                                    const active = safeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => selectTab(item.id)}
                                            aria-current={active ? 'page' : undefined}
                                            className={`flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                                                active ? 'bg-brewasa-copper text-white shadow' : 'hover:bg-white/10 text-gray-300'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/10">
                    <button
                        onClick={logout}
                        className="w-full py-2.5 flex items-center justify-center gap-2 border border-red-800 text-red-300 rounded-lg hover:bg-red-900/50 transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" /> Keluar
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-4 md:p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    {safeTab === 'pos' && <PosSystem />}
                    {safeTab === 'history' && <TransactionHistory isAdmin={isAdmin} />}
                    {safeTab === 'finance' && <FinanceManager />}
                    {safeTab === 'performance' && <EmployeePerformance />}
                    {safeTab === 'menu' && <MenuManager />}
                    {safeTab === 'stories' && <StoryModerator />}
                    {safeTab === 'announcements' && <AnnouncementManager />}
                    {safeTab === 'notes' && <NotesManager />}
                    {safeTab === 'top-spenders' && <TopSpenders />}
                    {safeTab === 'inventory' && <InventoryManager />}
                    {safeTab === 'costing' && <CostingManager />}
                    {safeTab === 'exports' && <ExportManager />}
                    {safeTab === 'users' && <UserManager />}
                </div>
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
