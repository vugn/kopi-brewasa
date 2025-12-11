import React from 'react';
import { MapPin } from 'lucide-react';

const Location: React.FC = () => {
    return (
        <section id="location" className="py-24 bg-brewasa-cream text-brewasa-dark">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-12">

                    {/* Text Content */}
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
                            Lokasi Kami
                        </h2>
                        <h3 className="text-4xl md:text-5xl font-bold mb-6">
                            Mampir Sebentar, <br /> Seduh Cerita.
                        </h3>
                        <p className="text-brewasa-dark/70 text-lg font-light leading-relaxed mb-8">
                            Kami menunggu ceritamu di sudut favorit kedai kami. Datanglah kapan saja, pintu kami selalu terbuka untuk mereka yang butuh jeda.
                        </p>

                        <div className="flex items-start gap-4 p-6 bg-white/50 border border-brewasa-dark/10 rounded-2xl">
                            <MapPin className="w-6 h-6 text-brewasa-copper flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-lg mb-2">Kopi Brewasa</h4>
                                <p className="text-brewasa-dark/80 leading-relaxed">
                                    Jl. Jalur I No.5, Surgi Mufti, <br />
                                    Kec. Banjarmasin Utara, Kota Banjarmasin, <br />
                                    Kalimantan Selatan 70122
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Map Embed */}
                    <div className="w-full lg:w-1/2">
                        <div className="bg-white p-2 rounded-3xl shadow-xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.1988336846734!2d114.60344620000001!3d-3.300907!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2de423584868f1b1%3A0xe72d8e2222b5353b!2sKopi%20Brewasa!5e0!3m2!1sid!2sid!4v1765445840983!5m2!1sid!2sid"
                                width="100%"
                                height="450"
                                style={{ border: 0, borderRadius: '20px' }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Lokasi Kopi Brewasa"
                            ></iframe>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Location;
