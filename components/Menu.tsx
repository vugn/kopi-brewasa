import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const Menu: React.FC = () => {
  const { items, addToCart, decreaseQuantity } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error("Error fetching menu:", error);
      } else if (data) {
        // Map Supabase snake_case to camelCase if needed, or adjust types.
        // Our SQL uses: id, name, description, price, image, tags, for_what
        // Our Type uses: id, name, description, price, image, tags, forWhat
        const formattedData = data.map((item: any) => ({
          ...item,
          forWhat: item.for_what // Transform snake to camel
        }));
        setMenuItems(formattedData);
      }
      setLoading(false);
    };

    fetchMenu();
  }, []);

  const getQuantity = (id: string) => {
    return items.find(i => i.id === id)?.quantity || 0;
  };

  return (
    <section id="menu" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
            Signature Taste
          </h2>
          <h3 className="text-4xl font-bold text-brewasa-dark">
            Menu Pilihan
          </h3>
          <p className="mt-4 text-brewasa-dark/60 font-light">
            Nama yang nyastra, rasa yang nyata.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brewasa-copper border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {menuItems.length === 0 && (
              <p className="col-span-full text-center text-brewasa-dark/50 italic">Menu belum tersedia saat ini.</p>
            )}
            {menuItems.map((item) => {
              const qty = getQuantity(item.id);

              return (
                <div key={item.id} className="group cursor-default flex flex-col h-full bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  {/* Image Card */}
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-6">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold text-brewasa-dark shadow-sm font-mono">
                      {item.price}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-grow flex flex-col px-2">
                    <h4 className="text-2xl font-bold text-brewasa-dark mb-2 font-serif group-hover:text-brewasa-copper transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider border border-brewasa-dark/20 px-2 py-0.5 rounded-full text-brewasa-dark/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-brewasa-dark/70 leading-relaxed text-sm mb-6">
                      {item.description}
                    </p>

                    {/* Add to Cart Actions */}
                    <div className="mt-auto space-y-6">
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full py-3 rounded-xl bg-brewasa-dark text-white font-bold hover:bg-brewasa-copper transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Pesan Sekarang</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1 border border-gray-100">
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-brewasa-dark">{qty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-brewasa-dark text-white shadow-sm hover:bg-brewasa-copper transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Untuk Apa Section */}
                      <div className="pt-6 border-t border-dashed border-gray-200">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-brewasa-copper uppercase tracking-widest mt-1 min-w-max">Untuk Apa?</span>
                          <p className="text-brewasa-dark/60 text-xs italic font-light leading-relaxed">
                            "{item.forWhat}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Menu;