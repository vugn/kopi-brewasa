import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Coffee, ShoppingBag, MapPin, User, Home } from 'lucide-react';
import { useCart } from '../context/CartContext';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

const CartDrawer: React.FC = () => {
    const { items, isOpen, toggleCart, removeFromCart, addToCart, decreaseQuantity, totalPrice } = useCart();
    const [orderType, setOrderType] = useState<OrderType>('dine-in');
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState('');

    // Hardcoded phone number for now
    const WA_NUMBER = '6281373388605';

    const handleCheckout = () => {
        if (!customerName.trim()) {
            alert('Mohon isi nama pemesan');
            return;
        }

        if (orderType === 'delivery' && !address.trim()) {
            alert('Mohon isi alamat pengiriman');
            return;
        }

        let message = `Halo Kopi Brewasa! 👋\nSaya mau pesan atas nama *${customerName}*:\n\n`;

        items.forEach(item => {
            message += `${item.quantity}x ${item.name} @ ${item.price}\n`;
        });

        message += `\n*Total: Rp ${totalPrice.toLocaleString('id-ID')}*`;
        message += `\n\nTipe: ${orderType.toUpperCase()}`;

        if (orderType === 'delivery') {
            message += `\nAlamat: ${address}`;
        }

        message += `\n\nMohon diproses ya! ☕`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodedMessage}`, '_blank');
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                    onClick={toggleCart}
                />
            )}

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F7E9D3]">
                    <h2 className="text-xl font-bold text-brewasa-dark flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Keranjang Saya
                    </h2>
                    <button onClick={toggleCart} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-6 h-6 text-brewasa-dark" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                            <Coffee className="w-16 h-16 text-brewasa-copper" />
                            <p className="text-lg font-medium text-brewasa-dark">Keranjang masih kosong</p>
                            <p className="text-sm">Yuk pilih kopi favoritmu!</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-brewasa-dark text-sm">{item.name}</h3>
                                        <p className="text-brewasa-copper font-medium text-sm">{item.price}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 border border-gray-200 shadow-sm">
                                            <button
                                                onClick={() => decreaseQuantity(item.id)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-brewasa-dark"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-brewasa-dark"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Checkout */}
                {items.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-white space-y-6">

                        {/* Order Type Selector */}
                        <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
                            {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setOrderType(type)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center gap-1 ${orderType === type
                                            ? 'bg-brewasa-dark text-white shadow-md'
                                            : 'text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {type === 'dine-in' && <Coffee className="w-4 h-4" />}
                                    {type === 'takeaway' && <ShoppingBag className="w-4 h-4" />}
                                    {type === 'delivery' && <Home className="w-4 h-4" />}
                                    {type.replace('-', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Inputs */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                    <User className="w-3 h-3" /> Nama Pemesan
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ketik namamu..."
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50"
                                />
                            </div>

                            {orderType === 'delivery' && (
                                <div className="space-y-2 animate-fadeIn">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Alamat Lengkap
                                    </label>
                                    <textarea
                                        placeholder="Jalan, Nomor Rumah, Patokan..."
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 resize-none h-20"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Total & Button */}
                        <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                            <div className="flex justify-between items-center text-lg font-bold text-brewasa-dark">
                                <span>Total</span>
                                <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
                            </div>

                            <button
                                onClick={handleCheckout}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-600/30 active:scale-95"
                            >
                                <span>Pesan via WhatsApp</span>
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </>
    );
};

export default CartDrawer;
