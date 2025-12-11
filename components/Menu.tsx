import React from 'react';
import { MenuItem } from '../types';

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Kopi Renjana',
    description: 'Pahit, tegas, membangunkan logikamu yang tertidur. Double shot espresso dengan air panas suhu presisi.',
    price: '28k',
    tags: ['Americano', 'Long Black', 'Strong'],
    image: 'https://picsum.photos/seed/americano/400/300'
  },
  {
    id: '2',
    name: 'Latte Jeda',
    description: 'Manis yang pas, tidak berlebihan, seperti istirahat yang cukup. Perpaduan espresso, susu creamy, dan gula aren asli.',
    price: '32k',
    tags: ['Aren Latte', 'Creamy', 'Comfort'],
    image: 'https://picsum.photos/seed/latte/400/300'
  },
  {
    id: '3',
    name: 'Berry Refleksi',
    description: 'Segar, mengejutkan, memberi perspektif baru. Cold brew dengan sentuhan berry dan soda water.',
    price: '35k',
    tags: ['Mocktail', 'Refreshing', 'Unique'],
    image: 'https://picsum.photos/seed/mocktail/400/300'
  }
];

const Menu: React.FC = () => {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {menuItems.map((item) => (
            <div key={item.id} className="group cursor-default">
              {/* Image Card */}
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-6">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brewasa-dark shadow-sm">
                  {item.price}
                </div>
              </div>

              {/* Text Content */}
              <div className="text-center px-4">
                <h4 className="text-2xl font-bold text-brewasa-dark mb-2 font-serif group-hover:text-brewasa-copper transition-colors">
                  {item.name}
                </h4>
                <div className="flex justify-center gap-2 mb-4">
                    {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider border border-brewasa-dark/20 px-2 py-0.5 rounded text-brewasa-dark/60">
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-brewasa-dark/70 leading-relaxed text-sm">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Menu;