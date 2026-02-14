import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Calculator, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuItem } from '../../types';

interface CartItem extends MenuItem {
    quantity: number;
}

const PosSystem: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // UI State
    const [isCartOpen, setIsCartOpen] = useState(false); // Mobile Cart Drawer

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY'>('DINE_IN');
    const [cashGiven, setCashGiven] = useState('');
    const [customerName, setCustomerName] = useState('');

    // Voucher State
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherNotes, setVoucherNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    // New Features State
    const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MAIN' | 'ADDON' | 'SPECIAL'>('ALL');
    const [orderNotes, setOrderNotes] = useState('');
    const [voucherDiscountType, setVoucherDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [voucherDiscountValue, setVoucherDiscountValue] = useState(''); // Raw input


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

    // Helper for numeric input
    const formatNumber = (num: number) => num.toLocaleString('id-ID');
    const parsePrice = (priceStr: string) => parseInt(priceStr.toLowerCase().replace('k', '000').replace(/[^0-9]/g, ''));

    const totalAmount = cart.reduce((sum, item) => {
        return sum + (parsePrice(item.price) * item.quantity);
    }, 0);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredMenu = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        // Filter HIDDEN items (unless specifically looking for them? No, POS should hide them)
        // Assume is_available defaults to true if undefined
        // const isAvailable = item.is_available !== false; // REMOVED: Staff should see hidden items

        const matchesCategory = selectedCategory === 'ALL' || (item.category || 'MAIN') === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Discount & Final Total Calculation
    const discountValueNum = parseInt(voucherDiscountValue.replace(/\./g, '')) || 0;

    let discountNum = 0;
    if (voucherDiscountType === 'FIXED') {
        discountNum = discountValueNum;
    } else {
        // Percentage
        // Cap at 100%
        const percent = Math.min(100, discountValueNum);
        discountNum = Math.round(totalAmount * (percent / 100));
    }

    const finalTotal = Math.max(0, totalAmount - discountNum);

    // Smart Change Logic
    const cashGivenNum = parseInt(cashGiven.replace(/\./g, '')) || 0;
    const change = cashGivenNum - finalTotal;

    const getSmartChangeSuggestion = () => {
        if (change < 0) return null;
        const targets = [5000, 10000, 20000, 50000, 100000];
        for (const target of targets) {
            if (target > change) {
                const needed = target - change;
                if (needed <= 10000) {
                    return { needed, resultChange: target };
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
            const { data: trans, error: transError } = await supabase
                .from('transactions')
                .insert([{
                    total_amount: finalTotal,
                    subtotal: totalAmount,
                    discount_amount: discountNum,
                    payment_method: paymentMethod,
                    order_type: orderType,
                    status: 'PENDING',
                    customer_name: customerName,
                    voucher_code: voucherCode || null,
                    voucher_notes: voucherNotes || null,
                    created_at: new Date().toISOString(),
                    notes: orderNotes || null,
                    voucher_discount_type: voucherDiscountType,
                    voucher_discount_value: discountValueNum
                }])
                .select()
                .single();

            if (transError) throw transError;

            const itemsPayload = cart.map(item => ({
                transaction_id: trans.id,
                menu_item_id: item.id,
                quantity: item.quantity,
                price: parsePrice(item.price),
                item_name: item.name
            }));

            const { error: itemsError } = await supabase.from('transaction_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            // Trigger Stock Deduction
            const { error: stockError } = await supabase.rpc('process_transaction_stock', { transaction_uuid: trans.id });
            if (stockError) console.error("Stock deduction failed:", stockError); // Don't block UI, just log

            alert('Transaksi Berhasil!');
            setCart([]);
            setShowPaymentModal(false);
            setIsCartOpen(false); // Close mobile cart if open
            setCashGiven('');
            setCustomerName('');
            setVoucherCode('');
            setVoucherNotes('');
            setOrderNotes('');
            setVoucherDiscountType('FIXED');
            setVoucherDiscountValue('');
        } catch (err: any) {
            alert('Gagal memproses transaksi: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] gap-6 relative">
            {/* Left Panel: Menu Grid */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-20 lg:pb-0">
                {/* Header */}
                <div className="p-4 border-b flex gap-4 sticky top-0 bg-white z-10">
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

                {/* Category Tabs */}
                <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'ALL', label: 'Semua' },
                        { id: 'MAIN', label: 'Utama' },
                        { id: 'ADDON', label: 'Add-on / Extra' },
                        { id: 'SPECIAL', label: 'Spesial' }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                ? 'bg-brewasa-dark text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="text-center p-10">Loading menu...</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {filteredMenu.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="text-left bg-white border hover:border-brewasa-copper rounded-xl p-2 md:p-3 transition-all hover:shadow-md group flex flex-col h-full active:scale-95"
                                >
                                    <div className="bg-gray-100 rounded-lg h-28 md:h-32 w-full mb-2 md:mb-3 overflow-hidden relative">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        {/* Add Button Overlay hint */}
                                        <div className="absolute bottom-2 right-2 bg-white/90 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="w-4 h-4 text-brewasa-copper" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{item.name}</h3>
                                    <p className="text-brewasa-copper font-medium mt-auto text-sm md:text-base">{item.price}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Sticky Bottom Bar (Visible only on Local/Tablet when cart not empty) */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between pb-8 md:pb-4">
                    <div onClick={() => setIsCartOpen(true)} className="flex flex-col">
                        <span className="text-xs text-gray-500">{totalItems} Item</span>
                        <span className="font-bold text-lg text-brewasa-dark">Rp {formatNumber(totalAmount)}</span>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="px-6 py-2 bg-brewasa-dark text-white rounded-lg font-bold flex items-center gap-2"
                    >
                        <ChevronUp className="w-4 h-4" /> Lihat & Bayar
                    </button>
                </div>
            )}

            {/* Right Panel: Cart (Desktop: Standard Side Panel, Mobile: Bottom Sheet/Modal) */}
            <div className={`
          fixed inset-0 z-50 lg:static lg:z-0
          lg:w-96 bg-white lg:rounded-2xl lg:shadow-sm lg:border lg:border-gray-100 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
                {/* Mobile Header for Cart Drawer */}
                <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center lg:hidden">
                    <h2 className="font-bold text-lg flex items-center gap-2">Detail Pesanan</h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2"><ChevronDown /></button>
                </div>

                {/* Desktop Header */}
                <div className="p-4 border-b bg-gray-50/50 hidden lg:block">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Current Order
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 lg:pb-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">Keranjang kosong</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-3 items-center border-b pb-3 last:border-0">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                                    <p className="text-sm text-gray-500">{item.price}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-2 lg:p-1 hover:bg-white rounded-md transition-colors"><Minus className="w-4 h-4" /></button>
                                    <span className="font-mono w-8 text-center text-sm font-bold">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-2 lg:p-1 hover:bg-white rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 lg:relative fixed bottom-0 left-0 right-0 w-full mb-0 pb-8 lg:pb-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Total</span>
                        <span className="text-2xl font-bold text-brewasa-dark">Rp {formatNumber(totalAmount)}</span>
                    </div>
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full py-4 bg-brewasa-dark text-white rounded-xl font-bold hover:bg-brewasa-copper transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg"
                    >
                        Bayar Sekarang
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header - Pinned */}
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                            <h3 className="font-bold text-xl">Pembayaran</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Customer Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Customer</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brewasa-copper focus:outline-none"
                                    placeholder="Contoh: Budi"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            {/* Order Notes */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Catatan Pesanan (Order Notes)</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 resize-none h-20"
                                    placeholder="Contoh: Jangan terlalu manis, Es sedikit..."
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                />
                            </div>

                            {/* Order Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tipe Pesanan</label>
                                <div className="flex gap-2">
                                    {['DINE_IN', 'TAKE_AWAY', 'DELIVERY'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setOrderType(type as any)}
                                            className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${orderType === type ? 'bg-brewasa-dark text-white border-brewasa-dark' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {type.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Metode Pembayaran</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'CASH', icon: Banknote, label: 'Tunai' },
                                        { id: 'QRIS', icon: Smartphone, label: 'QRIS' },
                                        { id: 'TRANSFER', icon: CreditCard, label: 'TF' }
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

                            {/* Voucher Section */}
                            <div className="space-y-4 border-t pt-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Kode Voucher (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brewasa-copper focus:outline-none uppercase"
                                        placeholder="Contoh: PROMO20"
                                        value={voucherCode}
                                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                                    />
                                </div>

                                {voucherCode && (
                                    <>
                                        <div className="animate-fadeIn">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Catatan Voucher
                                            </label>
                                            <textarea
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 resize-none h-16"
                                                placeholder="Contoh: Voucher dari event Instagram"
                                                value={voucherNotes}
                                                onChange={e => setVoucherNotes(e.target.value)}
                                            />
                                        </div>

                                        <div className="animate-fadeIn">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Nilai Diskon (Opsional)
                                            </label>
                                            <div className="relative">
                                                {voucherDiscountType === 'FIXED' && (
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                                )}
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    className={`w-full ${voucherDiscountType === 'FIXED' ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-brewasa-copper focus:outline-none`}
                                                    placeholder="0"
                                                    value={voucherDiscountValue}
                                                    onChange={e => setVoucherDiscountValue(e.target.value)}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex bg-gray-200 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setVoucherDiscountType('FIXED')}
                                                        className={`px-2 py-1 rounded text-xs font-bold ${voucherDiscountType === 'FIXED' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500'}`}
                                                    >
                                                        Rp
                                                    </button>
                                                    <button
                                                        onClick={() => setVoucherDiscountType('PERCENT')}
                                                        className={`px-2 py-1 rounded text-xs font-bold ${voucherDiscountType === 'PERCENT' ? 'bg-white shadow text-brewasa-dark' : 'text-gray-500'}`}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </div>
                                            {discountNum > 0 && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">
                                                    💰 Diskon: Rp {formatNumber(discountNum)}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
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
                                                inputMode="numeric"
                                                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-lg font-mono font-bold focus:ring-2 focus:ring-brewasa-copper focus:outline-none"
                                                value={cashGiven}
                                                onChange={e => setCashGiven(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Subtotal</span>
                                            <span className="font-bold">Rp {formatNumber(totalAmount)}</span>
                                        </div>

                                        {discountNum > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Diskon Voucher</span>
                                                <span className="font-bold">- Rp {formatNumber(discountNum)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                            <span className="text-gray-800 font-bold">Total Bayar</span>
                                            <span className="text-xl font-bold font-mono text-brewasa-dark">
                                                Rp {formatNumber(finalTotal)}
                                            </span>
                                        </div>

                                        {cashGiven && (
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                <span className="text-gray-800 font-medium">Kembalian</span>
                                                <span className={`text-xl font-bold font-mono ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    Rp {change < 0 ? '-' : formatNumber(change)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Smart Change Suggestion */}
                                    {suggestion && change >= 0 && (
                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                                <Calculator className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-blue-800 font-medium">Saran Kembalian Pintar</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    Minta <span className="font-bold">Rp {formatNumber(suggestion.needed)}</span> lagi,
                                                    kembalian jadi <span className="font-bold">Rp {formatNumber(suggestion.resultChange)}</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer - Pinned */}
                        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
                            <button
                                onClick={handleCheckout}
                                disabled={processing || (paymentMethod === 'CASH' && change < 0)}
                                className="w-full py-4 bg-brewasa-dark text-white rounded-xl font-bold text-lg hover:bg-brewasa-copper transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {processing ? 'Memproses...' : `Selesaikan (Rp ${formatNumber(finalTotal)})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosSystem;
