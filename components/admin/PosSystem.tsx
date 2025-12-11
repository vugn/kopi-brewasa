import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Calculator, X } from 'lucide-react';
import { MenuItem } from '../../types';

interface CartItem extends MenuItem {
    quantity: number;
}

const PosSystem: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [cashGiven, setCashGiven] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        const { data } = await supabase.from('menu_items').select('*').order('name');
        if (data) setMenuItems(data);
        setLoading(false);
    };

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(i => i.quantity > 0));
    };

    const totalAmount = cart.reduce((sum, item) => {
        // Parse price "25k" -> 25000
        const price = parseInt(item.price.toLowerCase().replace('k', '000').replace(/[^0-9]/g, ''));
        return sum + (price * item.quantity);
    }, 0);

    const filteredMenu = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Smart Change Logic
    const cashGivenNum = parseInt(cashGiven.replace(/\./g, '')) || 0;
    const change = cashGivenNum - totalAmount;

    const getSmartChangeSuggestion = () => {
        if (change < 0) return null;

        // Target "Neater" Change: 5k, 10k, 20k, 50k, 100k
        // Calculate remainder to reach next nice banknote
        // Example: Bill 20k. Given 22k. Change 2k.
        // Next nice change is 5k. Diff = 3k.
        // Suggestion: "Minta 3.000 lagi untuk kembalian 5.000"

        const targets = [5000, 10000, 20000, 50000, 100000];
        for (const target of targets) {
            if (target > change) {
                const needed = target - change;
                // Only suggest if needed amount is reasonable (e.g. <= 5000 or <= 10000)
                if (needed <= 10000) {
                    return {
                        needed,
                        resultChange: target
                    };
                }
            }
        }
        return null;
    };

    const suggestion = getSmartChangeSuggestion();

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!customerName.trim()) {
            alert("Mohon isi nama customer");
            return;
        }
        setProcessing(true);

        try {
            // 1. Create Transaction
            const { data: trans, error: transError } = await supabase
                .from('transactions')
                .insert([{
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    status: 'PENDING', // Default to PENDING now, admin can update later
                    customer_name: customerName,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (transError) throw transError;

            // 2. Create Transaction Items
            const itemsPayload = cart.map(item => ({
                transaction_id: trans.id,
                menu_item_id: item.id,
                quantity: item.quantity,
                price: parseInt(item.price.replace('k', '000').replace(/[^0-9]/g, '')),
                item_name: item.name
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;

            alert('Transaksi Berhasil!');
            setCart([]);
            setShowPaymentModal(false);
            setCashGiven('');
            setCustomerName('');
        } catch (err: any) {
            alert('Gagal memproses transaksi: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">
            {/* Left Panel: Menu Grid */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari menu..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brewasa-copper/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center p-10">Loading menu...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredMenu.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="text-left bg-white border hover:border-brewasa-copper rounded-xl p-3 transition-all hover:shadow-md group flex flex-col h-full"
                                >
                                    <div className="bg-gray-100 rounded-lg h-32 w-full mb-3 overflow-hidden">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                                    <p className="text-brewasa-copper font-medium mt-auto">{item.price}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="p-4 border-b bg-gray-50/50">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Current Order
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            Keranjang kosong
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-3 items-center">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                                    <p className="text-sm text-gray-500">{item.price}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus className="w-4 h-4" /></button>
                                    <span className="font-mono w-6 text-center text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Total</span>
                        <span className="text-2xl font-bold text-brewasa-dark">Rp {totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full py-3 bg-brewasa-dark text-white rounded-xl font-bold hover:bg-brewasa-copper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        Bayar Sekarang
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-xl">Pembayaran & Checkout</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Customer Name Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Customer</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brewasa-copper focus:outline-none"
                                    placeholder="Contoh: Budi, Meja 5"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            {/* Method Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Metode Pembayaran</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'CASH', icon: Banknote, label: 'Tunai' },
                                        { id: 'QRIS', icon: Smartphone, label: 'QRIS' },
                                        { id: 'TRANSFER', icon: CreditCard, label: 'Transfer' }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setPaymentMethod(m.id as any)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-brewasa-copper bg-orange-50 text-brewasa-copper' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <m.icon className="w-6 h-6" />
                                            <span className="text-sm font-bold">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Input */}
                            {paymentMethod === 'CASH' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Uang Diterima</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                            <input
                                                type="number"
                                                autoFocus
                                                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-lg font-mono font-bold focus:ring-2 focus:ring-brewasa-copper focus:outline-none"
                                                value={cashGiven}
                                                onChange={e => setCashGiven(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Total Tagihan</span>
                                            <span className="font-bold">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                            <span className="text-gray-800 font-medium">Kembalian</span>
                                            <span className={`text-xl font-bold font-mono ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                Rp {change < 0 ? '-' : change.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Smart Change Suggestion */}
                                    {suggestion && change >= 0 && (
                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                <Calculator className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-blue-800 font-medium">Saran Kembalian Pintar 💡</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    Minta <span className="font-bold">Rp {suggestion.needed.toLocaleString('id-ID')}</span> lagi dari customer,
                                                    supaya kembaliannya jadi pas <span className="font-bold text-lg">Rp {suggestion.resultChange.toLocaleString('id-ID')}</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleCheckout}
                                disabled={processing || (paymentMethod === 'CASH' && change < 0)}
                                className="w-full py-4 bg-brewasa-dark text-white rounded-xl font-bold text-lg hover:bg-brewasa-copper transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brewasa-dark/20"
                            >
                                {processing ? 'Memproses...' : `Selesaikan Transaksi (Rp ${totalAmount.toLocaleString('id-ID')})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosSystem;
