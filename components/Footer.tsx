import React from 'react';
import { Instagram, MapPin, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brewasa-cream text-brewasa-dark border-t border-brewasa-dark/10 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          <div className="text-center md:text-left">
            <img src="/logo-text.png" alt="Brewasa Logo" className="h-10 mb-4 mx-auto md:mx-0" />
            <p className="text-sm opacity-60">© {new Date().getFullYear()} Kopi Brewasa. All rights reserved.</p>
          </div>

          <div className="flex gap-6">
            <a href="#" className="p-3 bg-brewasa-dark text-brewasa-cream rounded-full hover:bg-brewasa-copper transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-3 bg-brewasa-dark text-brewasa-cream rounded-full hover:bg-brewasa-copper transition-colors">
              <MapPin className="w-5 h-5" />
            </a>
            <a href="#" className="p-3 bg-brewasa-dark text-brewasa-cream rounded-full hover:bg-brewasa-copper transition-colors">
              <Phone className="w-5 h-5" />
            </a>
          </div>

        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-brewasa-dark/40 font-mono">
            Dewasa butuh jeda. Datanglah kapan saja.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;