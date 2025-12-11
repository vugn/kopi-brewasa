import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem } from '../types';

export interface CartItem extends MenuItem {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    isOpen: boolean;
    totalItems: number;
    totalPrice: number;
    addToCart: (item: MenuItem) => void;
    removeFromCart: (itemId: string) => void;
    decreaseQuantity: (itemId: string) => void;
    toggleCart: () => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load cart from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('brewasa_cart');
        if (savedCart) {
            setItems(JSON.parse(savedCart));
        }
    }, []);

    // Save cart to local storage whenever items change
    useEffect(() => {
        localStorage.setItem('brewasa_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (item: MenuItem) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
    };

    const decreaseQuantity = (itemId: string) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map((i) =>
                    i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                );
            }
            return prev.filter((i) => i.id !== itemId);
        });
    };

    const toggleCart = () => setIsOpen((prev) => !prev);
    const clearCart = () => setItems([]);

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    const totalPrice = items.reduce((acc, item) => {
        // Parse "35k" to 35000
        const priceNumber = parseInt(item.price.replace('k', '000').replace('.', ''));
        return acc + (priceNumber * item.quantity);
    }, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                isOpen,
                totalItems,
                totalPrice,
                addToCart,
                removeFromCart,
                decreaseQuantity,
                toggleCart,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
