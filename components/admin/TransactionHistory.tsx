import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Search, Filter, Loader2, Calendar, User, ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle, Download, TrendingUp, DollarSign, Trash2, Edit, Plus, Minus, X, CreditCard, Banknote, QrCode } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TransactionItem {
    id?: string; // Optional for new items
    transaction_id?: string;
    menu_item_id?: string; // Needed for referencing
    item_name: string;
    quantity: number;
    price: number;
}

interface Transaction {
    id: string;
    created_at: string;
    total_amount: number;
    subtotal?: number;
    discount_amount?: number;
    voucher_code?: string;
    voucher_notes?: string;
    payment_method: string;
    status: string;
    customer_name?: string;
    order_type?: string;
    items?: TransactionItem[];
    transaction_items?: TransactionItem[];
}

interface MenuItem {
    id: string;
    name: string;
    price: string;
}

const TransactionHistory: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPayment, setFilterPayment] = useState('ALL');
    const [filterVoucher, setFilterVoucher] = useState<'ALL' | 'WITH_VOUCHER' | 'NO_VOUCHER'>('ALL');
    const [filterDate, setFilterDate] = useState({ start: '', end: '' });
    const [stats, setStats] = useState({
        daily: 0, weekly: 0, monthly: 0,
        dailyCups: 0, weeklyCups: 0, monthlyCups: 0,
        totalCups: 0
    });

    // Edit Items State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editItems, setEditItems] = useState<TransactionItem[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [newItemId, setNewItemId] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);

    // Payment Completion State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    useEffect(() => {
        fetchTransactions();
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        const { data } = await supabase.from('menu_items').select('id, name, price');
        if (data) setMenuItems(data);
    };

    const fetchTransactions = async () => {
        setLoading(true);
        // Supabase join syntax for one-to-many is a bit tricky with typing, 
        // sometimes easier to just fetch transactions and then fetch items or use a view.
        // For now let's query transactions and we can expand if needed.
        // Actually, let's just fetch transactions for the list, detail maybe later or expanded row.

        let query = supabase
            .from('transactions')
            .select(`
                *,
                order_type,
                voucher_code,
                voucher_notes,
                discount_amount,
                subtotal,
                transaction_items (
                    id, item_name, quantity, price, menu_item_id
                )
            `)
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching transactions:', error);
        } else {
            // @ts-ignore
            const trans: Transaction[] = data || [];
            setTransactions(trans);
            calculateStats(trans);
        }
        setLoading(false);
    };

    const calculateStats = (data: Transaction[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);



        let daily = 0;
        let weekly = 0;
        let monthly = 0;
        let dailyCups = 0;
        let weeklyCups = 0;
        let monthlyCups = 0;
        let totalCups = 0;

        data.forEach(t => {
            // Only count completed transactions for stats
            if (t.status !== 'COMPLETED') return;

            const tDate = new Date(t.created_at);

            // Calculate cups for this transaction
            let cupsInTransaction = 0;
            if (t.transaction_items) {
                cupsInTransaction = t.transaction_items.reduce((acc, item) => acc + item.quantity, 0);
            } else if (t.items) {
                cupsInTransaction = t.items.reduce((acc, item) => acc + item.quantity, 0);
            }

            // Daily
            if (tDate >= today) {
                daily += t.total_amount;
                dailyCups += cupsInTransaction;
            }

            // Weekly
            if (tDate >= startOfWeek) {
                weekly += t.total_amount;
                weeklyCups += cupsInTransaction;
            }

            // Monthly
            if (tDate >= startOfMonth) {
                monthly += t.total_amount;
                monthlyCups += cupsInTransaction;
            }

            // Total All Time
            totalCups += cupsInTransaction;
        });

        setStats({ daily, weekly, monthly, dailyCups, weeklyCups, monthlyCups, totalCups });
    };

    const updateStatus = async (id: string, newStatus: string) => {
        // Optimistic update
        const originalTransactions = [...transactions];
        setTransactions(transactions.map(t =>
            t.id === id ? { ...t, status: newStatus } : t
        ));

        try {
            const { data, error } = await supabase
                .from('transactions')
                .update({ status: newStatus })
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('Transaction not found or update failed.');
            }

            // Optional: Update with server data to be sure
            const updatedTransaction = data[0];
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, status: updatedTransaction.status } : t
            ));

            // Recalculate stats based on the verified new state
            calculateStats(transactions.map(t => t.id === id ? { ...t, status: newStatus } : t));

        } catch (err: any) {
            console.error('Failed to update status:', err);
            alert('Gagal update status: ' + err.message);
            // Revert optimistic update
            setTransactions(originalTransactions);
        }
    };

    const deleteTransaction = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return;

        // Use RPC to delete and restore stock
        const { error } = await supabase.rpc('delete_transaction_with_restore', { transaction_uuid: id });

        if (error) {
            console.error("Delete failed:", error);
            alert('Gagal menghapus transaksi: ' + error.message);
        } else {
            const updated = transactions.filter(t => t.id !== id);
            setTransactions(updated);
            calculateStats(updated);
            alert('Transaksi berhasil dihapus dan stok dikembalikan.');
        }
    };

    // --- Edit Items Logic ---
    const openEditModal = (t: Transaction) => {
        setEditingTransaction(t);
        // Deep copy items to avoid mutating state directly
        const items = t.transaction_items?.map(i => ({ ...i })) || [];
        setEditItems(items);
        setIsEditModalOpen(true);
        setNewItemId('');
        setNewItemQty(1);
    };

    const handleAddItem = () => {
        if (!newItemId) return;
        const menu = menuItems.find(m => m.id === newItemId);
        if (!menu) return;

        const existing = editItems.find(i => i.menu_item_id === newItemId); // Need menu_item_id in queries
        // Ideally we should have menu_item_id in the fetched items. 
        // Let's assume for now we might add a new line or increment. 
        // Since we don't have menu_item_id in the interface from previous fetch, we might fallback to name matching or just add new line.
        // Better: Fetch menu_item_id in fetchTransactions.

        const price = parseInt(menu.price);
        const newItem: TransactionItem = {
            item_name: menu.name,
            quantity: newItemQty,
            price: price,
            menu_item_id: menu.id
        };

        setEditItems([...editItems, newItem]);
        setNewItemId('');
        setNewItemQty(1);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...editItems];
        newItems.splice(index, 1);
        setEditItems(newItems);
    };

    const saveEditedItems = async () => {
        if (!editingTransaction) return;
        if (!window.confirm('Simpan perubahan item? Total transaksi akan dihitung ulang.')) return;

        try {
            // 1. Calculate new totals
            const newSubtotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discount = editingTransaction.discount_amount || 0;
            const newTotal = newSubtotal - discount;

            // 2. Update Transaction Details
            const { error: updateTransError } = await supabase
                .from('transactions')
                .update({
                    subtotal: newSubtotal,
                    total_amount: newTotal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTransaction.id);

            if (updateTransError) throw updateTransError;

            // 3. Sync Items (Simplest: Delete All & Re-insert)
            // Warning: This changes item IDs, might affect logs if referenced by item_id. 
            // For this app, logs reference ingredient_id, not transaction_item_id usually.
            // But let's check `delete_transaction_with_restore`. 
            // We are NOT deleting the transaction. 
            // We should delete existing items for this trans ID.
            const { error: deleteError } = await supabase
                .from('transaction_items')
                .delete()
                .eq('transaction_id', editingTransaction.id);

            if (deleteError) throw deleteError;

            // 4. Insert New Items
            // We need menu_item_id for each item. 
            // Existing items from basic fetch might NOT have menu_item_id if we didn't select it.
            // WE NEED TO UPDATE fetchTransactions TO INCLUDE menu_item_id.
            // For now, let's assume valid items have it, or we recover it from name (risky).
            // Let's fix fetchTransactions first in next step if needed. 
            // Actually, I'll update the fetch query in same step or earlier? 
            // I haven't updated fetch query yet. I should do that.

            const itemsPayload = editItems.map(item => ({
                transaction_id: editingTransaction.id,
                menu_item_id: item.menu_item_id, // This must be present!
                item_name: item.item_name,
                quantity: item.quantity,
                price: item.price
            }));

            // Filter out items without menu_item_id (legacy or error?)
            const validItems = itemsPayload.filter(i => i.menu_item_id);
            if (validItems.length !== itemsPayload.length) {
                alert("Warning: Beberapa item tidak memiliki ID valid dan tidak disimpan.");
            }

            const { error: insertError } = await supabase.from('transaction_items').insert(validItems);
            if (insertError) throw insertError;

            alert('Perubahan berhasil disimpan!');
            setIsEditModalOpen(false);
            fetchTransactions(); // Refresh UI

        } catch (err: any) {
            alert('Gagal menyimpan perubahan: ' + err.message);
        }
    };

    // --- Payment Completion Logic ---
    const openPaymentModal = (t: Transaction) => {
        setPaymentTransaction(t);
        setSelectedPaymentMethod('CASH'); // Default
        setIsPaymentModalOpen(true);
    };

    const completePayment = async () => {
        if (!paymentTransaction || !selectedPaymentMethod) return;

        try {
            const { error } = await supabase
                .from('transactions')
                .update({
                    payment_method: selectedPaymentMethod,
                    status: 'COMPLETED',
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentTransaction.id);

            if (error) throw error;

            alert('Pembayaran berhasil dikonfirmasi!');
            setIsPaymentModalOpen(false);
            fetchTransactions();
        } catch (err: any) {
            alert('Gagal update pembayaran: ' + err.message);
        }
    };

    const exportToExcel = () => {
        const dataToExport = filtered.map(t => ({
            ID: t.id,
            Date: new Date(t.created_at).toLocaleDateString(),
            Time: new Date(t.created_at).toLocaleTimeString(),
            Customer: t.customer_name || 'Anonymous',
            Type: t.order_type || 'N/A',
            Items: t.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', '),
            Subtotal: t.subtotal || t.total_amount,
            Voucher_Code: t.voucher_code || '-',
            Voucher_Notes: t.voucher_notes || '-',
            Discount: t.discount_amount || 0,
            Total: t.total_amount,
            Method: t.payment_method,
            Status: t.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `Brewasa_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filtered = transactions.filter(t => {
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
        const matchesPayment = filterPayment === 'ALL' || t.payment_method === filterPayment;
        const matchesVoucher = filterVoucher === 'ALL' ||
            (filterVoucher === 'WITH_VOUCHER' && !!t.voucher_code) ||
            (filterVoucher === 'NO_VOUCHER' && !t.voucher_code);

        // Date Filtering
        let matchesDate = true;
        if (filterDate.start) {
            const start = new Date(filterDate.start);
            const tDate = new Date(t.created_at);
            // Reset time for comparison
            start.setHours(0, 0, 0, 0);
            const tDateOnly = new Date(tDate);
            tDateOnly.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && tDateOnly >= start;
        }
        if (filterDate.end) {
            const end = new Date(filterDate.end);
            const tDate = new Date(t.created_at);
            end.setHours(23, 59, 59, 999);
            const tDateOnly = new Date(tDate);
            // We compare full date vs end of filtered day
            matchesDate = matchesDate && tDate <= end;
        }

        return matchesStatus && matchesDate && matchesPayment && matchesVoucher;
    });

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Penjualan Hari Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.daily.toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{stats.dailyCups} Cup Terjual</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Minggu Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.weekly.toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{stats.weeklyCups} Cup Terjual</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Bulan Ini</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">Rp {stats.monthly.toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{stats.monthlyCups} Cup Terjual</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Penjualan</p>
                        <h3 className="text-2xl font-bold text-brewasa-dark">{stats.totalCups} Cups</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">Sepanjang Waktu</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-brewasa-dark">Riwayat Transaksi</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        {/* Status Filter */}
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto self-start">
                            {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filterStatus === s
                                        ? 'bg-brewasa-dark text-white'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {s === 'ALL' ? 'Semua' : s}
                                </button>
                            ))}
                        </div>

                    </div>

                    {/* Date Filter */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                            value={filterDate.start}
                            onChange={e => setFilterDate(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                            value={filterDate.end}
                            onChange={e => setFilterDate(prev => ({ ...prev, end: e.target.value }))}
                        />
                        {(filterDate.start || filterDate.end) && (
                            <button
                                onClick={() => setFilterDate({ start: '', end: '' })}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Reset Date"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Payment Filter */}
                    <select
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                        value={filterPayment}
                        onChange={e => setFilterPayment(e.target.value)}
                    >
                        <option value="ALL">Semua Pembayaran</option>
                        <option value="CASH">Tunai</option>
                        <option value="QRIS">QRIS</option>
                        <option value="TRANSFER">Transfer</option>
                        <option value="OPEN_BILL">Open Bill</option>
                    </select>

                    {/* Voucher Filter */}
                    <select
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-brewasa-copper/20 outline-none"
                        value={filterVoucher}
                        // @ts-ignore
                        onChange={e => setFilterVoucher(e.target.value)}
                    >
                        <option value="ALL">Semua Transaksi</option>
                        <option value="WITH_VOUCHER">Dengan Voucher</option>
                        <option value="NO_VOUCHER">Tanpa Voucher</option>
                    </select>
                </div>
            </div>

            {/* Dashboard Summary based on Filter */}
            <div className="bg-gradient-to-r from-brewasa-dark to-brewasa-copper p-4 rounded-xl text-white shadow-lg mb-6">
                <h3 className="font-bold text-sm opacity-90 mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Ringkasan Filter Terpilih
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-xs opacity-75 mb-1">Total Omzet</p>
                        <p className="text-xl font-bold">
                            Rp {filtered.reduce((acc, t) => acc + t.total_amount, 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-xs opacity-75 mb-1">Total Transaksi</p>
                        <p className="text-xl font-bold">
                            {filtered.length} Transaksi
                        </p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-xs opacity-75 mb-1">Total Cups Terjual</p>
                        <p className="text-xl font-bold">
                            {filtered.reduce((acc, t) => {
                                let cups = 0;
                                if (t.transaction_items) {
                                    cups = t.transaction_items.reduce((sum, item) => sum + item.quantity, 0);
                                } else if (t.items) {
                                    cups = t.items.reduce((sum, item) => sum + item.quantity, 0);
                                }
                                return acc + cups;
                            }, 0)} Cups
                        </p>
                    </div>
                </div>
            </div>

            <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
                <Download className="w-4 h-4" /> Export Excel
            </button>


            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin text-brewasa-copper" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">ID & Waktu</th>
                                    <th className="p-4 font-semibold text-gray-600">Customer</th>
                                    <th className="p-4 font-semibold text-gray-600">Type</th>
                                    <th className="p-4 font-semibold text-gray-600">Items</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Voucher</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Diskon</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Metode</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">Tidak ada data transaksi.</td></tr>
                                )}
                                {filtered.map(t => (
                                    <React.Fragment key={t.id}>
                                        <tr className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-mono text-xs text-gray-400">#{t.id.slice(0, 8)}</div>
                                                <div className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(t.created_at).toLocaleDateString('id-ID')}
                                                    <div className="hidden sm:flex items-center gap-1">
                                                        <Clock className="w-3 h-3 ml-2" />
                                                        {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-brewasa-cream/50 flex items-center justify-center text-brewasa-dark font-bold text-xs border border-brewasa-cream shrink-0">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-gray-800 line-clamp-1">{t.customer_name || 'Tanpa Nama'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded text-xs font-bold border bg-blue-50 text-blue-600 border-blue-100 whitespace-nowrap">
                                                    {t.order_type?.replace('_', ' ') || 'DINE IN'}
                                                </span>
                                            </td>
                                            <td className="p-4 max-w-xs min-w-[200px]">
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    {/* @ts-ignore */}
                                                    {t.transaction_items?.map((i, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                                            <span className="font-bold">{i.quantity}x</span> {i.item_name}
                                                        </span>
                                                    ))}
                                                    <button
                                                        onClick={() => openEditModal(t)}
                                                        className="ml-auto p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Edit Item Transaksi"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {t.voucher_code ? (
                                                    <span className="px-2 py-1 rounded text-xs font-mono font-bold border bg-yellow-50 text-yellow-700 border-yellow-200">
                                                        {t.voucher_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {t.discount_amount && t.discount_amount > 0 ? (
                                                    <span className="font-bold text-green-600 whitespace-nowrap">
                                                        - Rp {t.discount_amount.toLocaleString('id-ID')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-bold text-brewasa-dark whitespace-nowrap">
                                                Rp {t.total_amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1 group">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${t.payment_method === 'OPEN_BILL' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                        {t.payment_method === 'OPEN_BILL' ? 'OPEN BILL' : t.payment_method}
                                                    </span>
                                                    {t.payment_method === 'OPEN_BILL' && t.status !== 'COMPLETED' && (
                                                        <button
                                                            onClick={() => openPaymentModal(t)}
                                                            className="p-1 text-brewasa-copper hover:bg-orange-50 rounded-full animate-pulse"
                                                            title="Selesaikan Pembayaran"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getStatusColor(t.status)}`}>
                                                        {t.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                                                        {t.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                                                        {t.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                                                        {t.status}
                                                    </div>
                                                    <select
                                                        value={t.status}
                                                        onChange={(e) => updateStatus(t.id, e.target.value)}
                                                        className="text-xs border rounded px-1 py-0.5 bg-white hover:border-brewasa-copper cursor-pointer outline-none mb-1"
                                                    >
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="PROCESSING">PROCESSING</option>
                                                        <option value="COMPLETED">COMPLETED</option>
                                                        <option value="CANCELLED">CANCELLED</option>
                                                    </select>
                                                    <button
                                                        onClick={() => deleteTransaction(t.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                                        title="Hapus Transaksi"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Voucher Notes Row (jika ada notes) */}
                                        {t.voucher_notes && (
                                            <tr className="bg-yellow-50/30 border-t border-yellow-100">
                                                <td colSpan={9} className="p-3">
                                                    <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3">
                                                        <p className="text-xs font-bold text-yellow-800 mb-1">📝 Catatan Voucher:</p>
                                                        <p className="text-xs text-yellow-700">{t.voucher_notes}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Edit Items Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Edit Item Transaksi</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                            {/* Current Items Table */}
                            <table className="w-full text-sm mb-6">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="p-2 text-left">Item</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Harga</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editItems.map((item, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2">{item.item_name}</td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            <td className="p-2 text-right">{item.price.toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right">{(item.price * item.quantity).toLocaleString('id-ID')}</td>
                                            <td className="p-2">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold text-lg bg-gray-50">
                                        <td colSpan={3} className="p-2 text-right">Total Baru:</td>
                                        <td className="p-2 text-right">
                                            Rp {editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString('id-ID')}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Add Item Form */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm mb-3 text-gray-700">Tambah Item Baru</h4>
                                <div className="flex gap-2">
                                    <select
                                        value={newItemId}
                                        onChange={e => setNewItemId(e.target.value)}
                                        className="flex-1 p-2 border rounded-lg text-sm bg-white"
                                    >
                                        <option value="">-- Pilih Menu --</option>
                                        {menuItems.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} - Rp {parseInt(m.price).toLocaleString('id-ID')}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItemQty}
                                        onChange={e => setNewItemQty(parseInt(e.target.value))}
                                        className="w-20 p-2 border rounded-lg text-sm bg-white text-center"
                                    />
                                    <button
                                        onClick={handleAddItem}
                                        disabled={!newItemId}
                                        className="bg-brewasa-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-brewasa-copper disabled:opacity-50"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
                            <button onClick={saveEditedItems} className="px-4 py-2 bg-brewasa-dark text-white font-bold rounded-lg hover:bg-brewasa-copper">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Completion Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-bold text-lg text-center">Selesaikan Pembayaran</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-center text-gray-500 mb-6">Pilih metode pembayaran untuk menyelesaikan transaksi ini.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setSelectedPaymentMethod('CASH')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedPaymentMethod === 'CASH' ? 'border-brewasa-copper bg-orange-50 text-brewasa-dark' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Banknote className="w-6 h-6" />
                                    <span className="font-extrabold flex-1 text-left">TUNAI / CASH</span>
                                    {selectedPaymentMethod === 'CASH' && <CheckCircle className="w-5 h-5 text-brewasa-copper" />}
                                </button>

                                <button
                                    onClick={() => setSelectedPaymentMethod('QRIS')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedPaymentMethod === 'QRIS' ? 'border-brewasa-copper bg-orange-50 text-brewasa-dark' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <QrCode className="w-6 h-6" />
                                    <span className="font-extrabold flex-1 text-left">QRIS</span>
                                    {selectedPaymentMethod === 'QRIS' && <CheckCircle className="w-5 h-5 text-brewasa-copper" />}
                                </button>

                                <button
                                    onClick={() => setSelectedPaymentMethod('TRANSFER')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedPaymentMethod === 'TRANSFER' ? 'border-brewasa-copper bg-orange-50 text-brewasa-dark' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="font-extrabold flex-1 text-left">TRANSFER BANK</span>
                                    {selectedPaymentMethod === 'TRANSFER' && <CheckCircle className="w-5 h-5 text-brewasa-copper" />}
                                </button>
                            </div>

                            <button
                                onClick={completePayment}
                                className="w-full mt-6 py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Bayar & Selesai
                            </button>
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="w-full mt-3 py-2 text-gray-500 font-bold hover:text-gray-700"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default TransactionHistory;
