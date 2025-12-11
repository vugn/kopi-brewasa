import React from 'react';
import { ArrowDown } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://picsum.photos/seed/brewasa1/1920/1080"
          alt="Coffee Atmosphere"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brewasa-cream/20 via-brewasa-cream/60 to-brewasa-cream"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center mt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-brewasa-dark mb-6 tracking-tight leading-tight">
          Menyeduh Rasa, <br />
          <span className="text-brewasa-copper italic font-light">Bukan Cuma Kopi.</span>
        </h1>
        <p className="text-lg md:text-xl text-brewasa-dark/80 max-w-2xl mx-auto mb-10 font-light">
          Tempat singgah untuk jiwamu yang butuh jeda di tengah riuhnya Banjarmasin.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <a
            href="#menu"
            className="px-8 py-3 border-2 border-brewasa-dark text-brewasa-dark font-medium rounded-full hover:bg-brewasa-dark hover:text-brewasa-cream transition-all duration-300 tracking-wide"
          >
            Lihat Menu
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <a href="#philosophy" className="text-brewasa-dark/50 hover:text-brewasa-dark transition-colors">
          <ArrowDown className="w-6 h-6" />
        </a>
      </div>
    </section>
  );
};

export default Hero;