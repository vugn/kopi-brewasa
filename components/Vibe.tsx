import React from 'react';
import { Music, PlayCircle, ExternalLink } from 'lucide-react';

const Vibe: React.FC = () => {
  return (
    <section id="vibe" className="py-24 bg-brewasa-dark text-brewasa-cream">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">

          <div className="w-full lg:w-1/2">
            <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
              The Vibe
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              Teman Melamun.
            </h3>
            <p className="text-brewasa-cream/70 text-lg font-light leading-relaxed mb-8">
              Kami percaya musik adalah bagian dari rasa kopi itu sendiri.
              Dengarkan playlist kurasi kami yang menemani momen jeda dan refleksimu.
              Slow jazz, indie folk, dan suara hujan yang menenangkan.
            </p>

            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-brewasa-copper text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
            >
              <Music className="w-5 h-5" />
              <span>Dengar di Spotify</span>
            </a>
          </div>

          {/* Spotify Embed */}
          <div className="w-full lg:w-5/12">
            <div className="rounded-3xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
              <iframe
                style={{ borderRadius: '12px' }}
                src="https://open.spotify.com/embed/playlist/37366RSekcucxiB7Fkw13E?utm_source=generator"
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Brewasa Playlist"
              ></iframe>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Vibe;