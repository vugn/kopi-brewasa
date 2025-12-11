import React, { useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';

const Contact: React.FC = () => {
    const [message, setMessage] = useState('');

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const encodedMessage = encodeURIComponent(message || 'Halo Kopi Brewasa, saya mau tanya...');
        window.open(`https://wa.me/6281373388605?text=${encodedMessage}`, '_blank');
    };

    return (
        <section id="contact" className="py-24 bg-brewasa-dark text-brewasa-cream relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brewasa-copper/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brewasa-cream/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
                        Hubungi Kami
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-bold mb-8">
                        Jangan Pendam Sendiri.
                    </h3>
                    <p className="text-white/70 text-lg font-light leading-relaxed mb-12 max-w-2xl mx-auto">
                        Entah itu tanya menu, reservasi, atau sekadar sapa. Kami di sini mendengarkan.
                    </p>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl shadow-xl max-w-lg mx-auto transform transition-all hover:scale-[1.01]">
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                            <label htmlFor="message" className="text-left text-sm font-bold text-brewasa-copper uppercase tracking-wide">Pesan untuk Barista</label>
                            <textarea
                                id="message"
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Halo, apakah ada meja kosong untuk nanti malam?"
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brewasa-copper focus:ring-1 focus:ring-brewasa-copper transition-all resize-none"
                            ></textarea>

                            <button
                                type="submit"
                                className="mt-2 w-full bg-brewasa-copper text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>Kirim via WhatsApp</span>
                                <MessageCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-xs text-white/30 text-center mt-2">
                                Kamu akan diarahkan ke WhatsApp untuk mengirim pesan ini.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
