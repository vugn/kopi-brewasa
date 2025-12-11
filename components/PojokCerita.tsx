import React, { useState, useEffect } from 'react';
import { PenTool, Send, Heart, Flame, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import FullCerita from './FullCerita';

interface Story {
    id: number;
    name: string;
    message: string;
    created_at: string;
    likes: number;
    isTop?: boolean;
}

const PojokCerita: React.FC = () => {
    const [stories, setStories] = useState<Story[]>([]);
    const [newName, setNewName] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isWriting, setIsWriting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showFullHistory, setShowFullHistory] = useState(false);

    // Persistence for likes using LocalStorage
    const [likedStoryIds, setLikedStoryIds] = useState<number[]>([]);

    useEffect(() => {
        // Load liked stories from local storage
        const savedLikes = localStorage.getItem('brewasa_liked_stories');
        if (savedLikes) {
            setLikedStoryIds(JSON.parse(savedLikes));
        }
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            setLoading(true);

            // Strategy:
            // 1. Get the most liked story from the last 7 days (Top Story)
            // 2. Get the 5 newest stories (excluding the Top Story ID if exists)

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // 1. Fetch Top Story
            const { data: topStories, error: topError } = await supabase
                .from('stories')
                .select('*')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('likes', { ascending: false })
                .limit(1);

            if (topError) throw topError;

            const topStory = topStories && topStories.length > 0 ? { ...topStories[0], isTop: true } : null;
            let finalStories: Story[] = [];

            // 2. Fetch Newest Stories
            let query = supabase
                .from('stories')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (topStory) {
                query = query.neq('id', topStory.id);
            }

            const { data: recentStories, error: recentError } = await query;
            if (recentError) throw recentError;

            if (topStory) {
                finalStories = [topStory, ...(recentStories || [])];
            } else {
                finalStories = recentStories || [];
            }

            setStories(finalStories);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkRateLimit = () => {
        const lastPostDate = localStorage.getItem('brewasa_last_post_date');
        const today = new Date().toDateString();
        return lastPostDate === today;
    };

    const updateRateLimit = () => {
        const today = new Date().toDateString();
        localStorage.setItem('brewasa_last_post_date', today);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!newMessage.trim()) return;

        // 1. Rate Limit Check
        if (checkRateLimit()) {
            setErrorMsg('Kamu sudah mengirim cerita hari ini. Kembali lagi besok ya!');
            return;
        }

        setSubmitLoading(true);

        try {
            // 2. Sanitize Input
            const sanitizedMessage = DOMPurify.sanitize(newMessage);
            const sanitizedName = DOMPurify.sanitize(newName) || 'Anonim';

            // 3. Insert to Supabase
            const { data, error } = await supabase
                .from('stories')
                .insert([{ name: sanitizedName, message: sanitizedMessage }])
                .select();

            if (error) throw error;

            // 4. Update UI & Local Config
            if (data) {
                // Refresh local list (naive approach, re-fetch is safer for correct ordering)
                await fetchStories();
                updateRateLimit();
                setNewMessage('');
                setNewName('');
                setIsWriting(false);
            }

        } catch (error) {
            console.error('Error submit story:', error);
            setErrorMsg('Gagal mengirim cerita. Coba lagi nanti.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleLike = async (id: number) => {
        if (likedStoryIds.includes(id)) return; // Prevent double like locally

        // Optimistic Update
        setLikedStoryIds(prev => {
            const newLikes = [...prev, id];
            localStorage.setItem('brewasa_liked_stories', JSON.stringify(newLikes));
            return newLikes;
        });

        setStories(prev => prev.map(s => s.id === id ? { ...s, likes: s.likes + 1 } : s));

        try {
            // RPC call to increment likes in DB (Safe & Atomic)
            const { error } = await supabase.rpc('increment_likes', { row_id: id });

            if (error) {
                console.error("Supabase RPC Error:", error);
                throw error;
            }

        } catch (error) {
            console.error("Failed to sync like:", error);
            // Optional: Show toast error
        }
    };

    if (showFullHistory) {
        return (
            <FullCerita
                onClose={() => setShowFullHistory(false)}
                likedStoryIds={likedStoryIds}
                onLike={handleLike}
            />
        );
    }

    return (
        <section id="pojok-cerita" className="py-24 bg-[#F7E9D3] relative min-h-[800px]">
            <div className="container mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-sm font-bold tracking-[0.2em] text-brewasa-copper uppercase mb-3">
                        Pojok Cerita
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-bold text-brewasa-dark mb-6">
                        Titip Rindu & Rasa
                    </h3>
                    <p className="text-brewasa-dark/70 font-light text-lg">
                        Setiap cangkir punya cerita. Tuliskan apa yang sedang kamu rasakan,
                        biarkan ia abadi di sini bersama aroma kopi.
                    </p>

                    <button
                        onClick={() => setIsWriting(!isWriting)}
                        className="mt-8 px-8 py-3 bg-brewasa-dark text-white rounded-full font-medium hover:bg-brewasa-copper transition-all duration-300 flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        <PenTool className="w-5 h-5" />
                        <span>Tulis Ceritamu</span>
                    </button>
                </div>

                {/* Writing Modal/Form */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isWriting ? 'max-h-[500px] opacity-100 mb-16' : 'max-h-0 opacity-0'}`}>
                    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-brewasa-copper/20 relative">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Namamu (Boleh kosong untuk Anonim)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-brewasa-dark"
                                maxLength={30}
                            />
                            <textarea
                                rows={4}
                                placeholder="Tulis ceritamu di sini..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-brewasa-dark resize-none"
                                maxLength={280}
                            ></textarea>

                            {errorMsg && (
                                <p className="text-red-500 text-sm text-center font-medium">{errorMsg}</p>
                            )}

                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="w-full py-3 bg-brewasa-copper text-white rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Kirim Cerita</span>
                                    </>
                                )}

                            </button>
                        </form>
                    </div>
                </div>

                {/* Masonry Grid Layout */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-brewasa-copper border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                        {stories.map((story) => (
                            <div
                                key={story.id}
                                className={`break-inside-avoid bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-brewasa-dark/5 relative overflow-hidden ${story.isTop ? 'ring-2 ring-brewasa-copper/20 bg-gradient-to-br from-white to-orange-50' : ''}`}
                            >
                                {story.isTop && (
                                    <div className="absolute top-0 right-0 bg-brewasa-copper text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                                        <Flame className="w-3 h-3" />
                                        <span>Minggu Ini</span>
                                    </div>
                                )}

                                <p className="text-brewasa-dark/80 italic font-serif text-lg leading-relaxed mb-6">
                                    "{story.message}"
                                </p>
                                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                    <div>
                                        <p className="font-bold text-brewasa-dark text-sm">{story.name}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {story.created_at ? formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: idLocale }) : 'Baru saja'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleLike(story.id)}
                                        className={`flex items-center gap-1 transition-colors px-3 py-1 rounded-full ${likedStoryIds.includes(story.id) ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${likedStoryIds.includes(story.id) ? 'fill-current' : ''}`} />
                                        <span className="text-xs font-medium">{story.likes}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && stories.length > 0 && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={() => setShowFullHistory(true)}
                            className="inline-flex items-center gap-2 border-b-2 border-brewasa-dark/20 pb-1 hover:border-brewasa-copper hover:text-brewasa-copper transition-colors"
                        >
                            <span className="font-semibold">Lihat Semua Cerita</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

            </div>
        </section>
    );
};

export default PojokCerita;
