import React from 'react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { Plus, Minus, ShoppingBag } from 'lucide-react';

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Brewasa Butter Bliss',
    description: 'Perpaduan espresso Brewasa dengan butter-caramel glaze yang creamy, wangi, dan comforting. Lembut, nggak eneg, dan bikin hangat dari tegukan pertama.',
    price: '35k',
    tags: ['Butter', 'Creamy', 'Comfort'],
    image: 'https://picsum.photos/seed/butter/400/300',
    forWhat: 'Untuk jiwa yang lelah dan butuh pelukan manis. Butter Bliss dibuat sebagai "comfort drink"—minuman yang bikin kamu merasa aman dan diterima, bahkan di hari paling berat.'
  },
  {
    id: '2',
    name: 'Aura Aren Latte',
    description: 'Espresso Brewasa berpadu dengan gula aren smoky-sweet yang khas Nusantara. Smooth, natural, dan terasa hangat di tenggorokan.',
    price: '28k',
    tags: ['Aren', 'Nusantara', 'Warm'],
    image: 'https://picsum.photos/seed/aren/400/300',
    forWhat: 'Untuk jiwa yang mencari ketenangan dan grounding. Aura Aren hadir untuk ngingetin bahwa hidup tetap manis kalau dinikmati perlahan.'
  },
  {
    id: '3',
    name: 'Classic Brewasa Latte',
    description: 'Signature espresso Brewasa berpadu dengan creamy milk yang seimbang. Simple, clean, dan nyaman—minuman yang nggak pernah salah.',
    price: '30k',
    tags: ['Classic', 'Balanced', 'Clean'],
    image: 'https://picsum.photos/seed/classic/400/300',
    forWhat: 'Untuk jiwa yang ingin stabil dan kembali ke dasar. Classic Latte adalah pilihan ketika kamu cuma ingin sesuatu yang familiar dan bikin hati tenang.'
  },
  {
    id: '4',
    name: 'Americano Breeze',
    description: 'Espresso Brewasa yang bold dan clean disajikan dengan air dingin segar. Light, refreshing, tapi tetap ngasih energi yang solid.',
    price: '25k',
    tags: ['Bold', 'Focus', 'Fresh'],
    image: 'https://picsum.photos/seed/americano/400/300',
    forWhat: 'Untuk jiwa yang butuh kejernihan dan fokus. Americano Breeze seperti hembusan angin sejuk yang bikin kepala kembali jernih dan siap lanjut lagi.'
  },
  {
    id: '5',
    name: 'Matcha Latte',
    description: 'Matcha smooth dengan creamy milk. Earthy, mellow, dan calming tanpa manis berlebihan.',
    price: '32k',
    tags: ['Matcha', 'Calming', 'Zen'],
    image: 'https://picsum.photos/seed/matcha/400/300',
    forWhat: 'Untuk jiwa yang penuh pikiran dan butuh jeda. Matcha Latte dibuat supaya kamu bisa tarik napas panjang, merilekskan bahu, dan melambat sebentar di tengah rutinitas.'
  }
];

const Menu: React.FC = () => {
  const { items, addToCart, decreaseQuantity } = useCart();

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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
      </div>
    </section>
  );
};

export default Menu;