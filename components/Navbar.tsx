import React, { useState, useEffect } from 'react';
import { Coffee, Menu, X } from 'lucide-react';
import { trackNavigation } from '../utils/analytics';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Filosofi', href: '#philosophy' },
    { name: 'Menu', href: '#menu' },
    { name: 'Pojok Cerita', href: '#pojok-cerita' },
    { name: 'Vibe', href: '#vibe' },
  ];

  return (
    <nav
      className={`sticky top-0 -mb-24 w-full z-50 transition-all duration-300 ${isScrolled
        ? 'bg-brewasa-dark/95 text-brewasa-cream shadow-lg backdrop-blur-sm py-4'
        : 'bg-transparent text-brewasa-dark py-6'
        }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#" className="flex items-center gap-2 group">
          <img
            src="/logo-text.png"
            alt="Brewasa Logo"
            className={`h-12 w-auto object-contain transition-all duration-300 group-hover:scale-105 ${isScrolled ? 'brightness-0 invert' : ''
              }`}
          />
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => trackNavigation(link.name)}
              className={`text-sm font-medium tracking-wide hover:text-brewasa-copper transition-colors ${isScrolled ? 'text-brewasa-cream' : 'text-brewasa-dark'
                }`}
            >
              {link.name}
            </a>
          ))}
          <a
            href="#menu"
            onClick={() => trackNavigation('Pesan Sekarang')}
            className={`px-5 py-2 border rounded-full text-sm font-medium transition-all duration-300 ${isScrolled
              ? 'border-brewasa-copper text-brewasa-copper hover:bg-brewasa-copper hover:text-white'
              : 'border-brewasa-dark text-brewasa-dark hover:bg-brewasa-dark hover:text-brewasa-cream'
              }`}
          >
            Pesan Sekarang
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className={isScrolled ? 'text-brewasa-cream' : 'text-brewasa-dark'} />
          ) : (
            <Menu className={isScrolled ? 'text-brewasa-cream' : 'text-brewasa-dark'} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-brewasa-dark text-brewasa-cream py-8 shadow-xl">
          <div className="flex flex-col items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  trackNavigation(link.name);
                }}
                className="text-lg font-medium hover:text-brewasa-copper transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;