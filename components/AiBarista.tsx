import React, { useState } from 'react';
import { Sparkles, X, MessageCircle, Send, Loader2 } from 'lucide-react';
import { getCoffeeRecommendation } from '../services/geminiService';

const AiBarista: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood.trim()) return;

    setIsLoading(true);
    setRecommendation(null);
    const result = await getCoffeeRecommendation(mood);
    setRecommendation(result);
    setIsLoading(false);
    setMood('');
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 bg-brewasa-copper text-white p-4 rounded-full shadow-xl hover:scale-110 transition-all duration-300 ${isOpen ? 'hidden' : 'flex'}`}
        aria-label="Ask AI Barista"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>

      {/* Modal/Panel */}
      <div 
        className={`fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl transform transition-all duration-300 origin-bottom-right border border-brewasa-dark/10 overflow-hidden ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-brewasa-dark p-4 flex justify-between items-center text-brewasa-cream">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brewasa-copper" />
            <h3 className="font-bold tracking-wide">AI Barista</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:text-brewasa-copper transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
            {!recommendation && !isLoading && (
                 <div className="mb-4 text-sm text-brewasa-dark/70 leading-relaxed">
                 <p className="mb-2">Bingung mau pesan apa?</p>
                 <p>Ceritakan perasaanmu hari ini (senang, lelah, butuh inspirasi), dan biarkan saya memilihkan menu untukmu.</p>
               </div>
            )}
         
          {/* Result Area */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-6 text-brewasa-copper">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-mono">Sedang meracik rekomendasi...</span>
            </div>
          )}

          {recommendation && (
            <div className="bg-brewasa-cream/30 p-4 rounded-xl border border-brewasa-copper/20 mb-4 animate-fadeIn">
                <p className="text-brewasa-dark text-sm italic font-medium leading-relaxed">
                    "{recommendation}"
                </p>
                <button 
                    onClick={() => setRecommendation(null)}
                    className="mt-3 text-xs text-brewasa-copper underline hover:text-brewasa-dark"
                >
                    Tanya lagi
                </button>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="relative mt-2">
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="Saya merasa..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-brewasa-copper focus:ring-1 focus:ring-brewasa-copper transition-all text-brewasa-dark"
              disabled={isLoading}
            />
            <button 
                type="submit" 
                disabled={!mood.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-brewasa-dark text-white rounded-md hover:bg-brewasa-copper disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AiBarista;