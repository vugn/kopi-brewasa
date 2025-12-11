import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CartFloatingButton: React.FC = () => {
    const { totalItems, toggleCart } = useCart();

    if (totalItems === 0) return null;

    return (
        <button
            onClick={toggleCart}
            className="fixed bottom-6 right-6 z-50 bg-brewasa-dark text-white p-4 rounded-full shadow-2xl hover:bg-brewasa-copper transition-all duration-300 transform hover:scale-110 flex items-center justify-center group"
        >
            <div className="relative">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-brewasa-dark group-hover:border-brewasa-copper transition-colors">
                    {totalItems}
                </span>
            </div>
        </button>
    );
};

export default CartFloatingButton;
