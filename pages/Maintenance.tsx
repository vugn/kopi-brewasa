import React from 'react';
import { Coffee, Clock, Instagram, Send } from 'lucide-react';

const Maintenance: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#F7E9D3] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-brewasa-copper/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brewasa-dark/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <div className="max-w-2xl w-full text-center relative z-10">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-brewasa-dark/10">
                    <div className="w-24 h-24 bg-brewasa-dark rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg animate-pulse">
                        <Coffee className="w-12 h-12 text-white" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-brewasa-dark mb-4">
                        Kami Sedang Menyeduh...
                    </h1>

                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        Website Kopi Brewasa sedang dalam peningkatan kualitas untuk memberikan pengalaman terbaik bagi Anda.
                        Kami akan segera kembali dengan aroma yang lebih segar! ☕✨
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
                        <div className="flex items-center justify-center gap-2 px-6 py-3 bg-brewasa-cream/30 text-brewasa-dark rounded-xl font-medium">
                            <Clock className="w-5 h-5" />
                            <span>Segera Hadir</span>
                        </div>
                        <a
                            href="https://instagram.com/kopibrewasa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-brewasa-dark text-white rounded-xl font-bold hover:bg-brewasa-copper transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            <Instagram className="w-5 h-5" />
                            <span>Cek Instagram Kami</span>
                        </a>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <p className="text-sm text-gray-400">
                            Hubungi kami via WhatsApp jika ada pesanan mendesak
                        </p>
                        <button className="mt-4 flex items-center justify-center gap-2 mx-auto text-brewasa-copper font-bold hover:text-brewasa-dark transition-colors">
                            <Send className="w-4 h-4" />
                            <span>+62 813-7338-605</span>
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-brewasa-dark/60 font-medium">
                    &copy; {new Date().getFullYear()} Kopi Brewasa. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Maintenance;
