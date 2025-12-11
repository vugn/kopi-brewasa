import React from 'react';
import { Feather, Coffee, Smile } from 'lucide-react';

const Philosophy: React.FC = () => {
  return (
    <section id="philosophy" className="py-24 bg-brewasa-cream relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-16">
          
          {/* Visual Side */}
          <div className="w-full md:w-1/2 relative">
            <div className="aspect-[4/5] rounded-t-full overflow-hidden border-b-4 border-brewasa-copper shadow-2xl">
              <img 
                src="https://picsum.photos/seed/reflection/800/1000" 
                alt="Philosophy of Coffee" 
                className="w-full h-full object-cover filter sepia-[0.3]"
              />
            </div>
            {/* Decorative Icon */}
            <div className="absolute -bottom-10 -right-5 bg-brewasa-dark text-brewasa-copper p-6 rounded-full shadow-lg">
              <Coffee className="w-10 h-10" />
            </div>
          </div>

          {/* Text Side */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
              Filosofi Kami
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold text-brewasa-dark mb-8">
              Kenapa <span className="italic font-light">Brewasa</span>?
            </h3>
            
            <div className="space-y-6 text-brewasa-dark/80 leading-relaxed font-light text-lg">
              <p>
                Brewasa bukan sekadar nama. Ini adalah perpaduan antara 
                <span className="font-semibold text-brewasa-dark"> "Brew" </span> 
                (seduhan) dan 
                <span className="font-semibold text-brewasa-dark"> "Dewasa"</span>.
              </p>
              <p>
                Menjadi dewasa itu melelahkan, penuh tuntutan, dan seringkali bising. 
                Kami percaya bahwa setiap orang dewasa berhak mendapatkan jeda yang berkualitas.
              </p>
              <p>
                Di sini, kami tidak hanya menyajikan kafein, tapi juga ketenangan. 
                Setiap cangkir adalah undangan untuk merenung, bernafas, dan kembali utuh.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-brewasa-dark/10 pt-8">
              <div className="flex flex-col items-center md:items-start">
                <Feather className="w-6 h-6 text-brewasa-copper mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-brewasa-dark">Tenang</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <Smile className="w-6 h-6 text-brewasa-copper mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-brewasa-dark">Jujur</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <Coffee className="w-6 h-6 text-brewasa-copper mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-brewasa-dark">Nikmat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;