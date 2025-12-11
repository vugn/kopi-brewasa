import React, { useState, useEffect } from 'react';
import { X, Heart, Calendar } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Story {
    id: number;
    name: string;
    message: string;
    created_at: string;
    likes: number;
}

interface FullCeritaProps {
    onClose: () => void;
    likedStoryIds: number[];
    onLike: (id: number) => void;
}

const FullCerita: React.FC<FullCeritaProps> = ({ onClose, likedStoryIds, onLike }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const STORIES_PER_PAGE = 12;

    const fetchStories = async (pageNumber: number) => {
        try {
            if (pageNumber === 0) setLoading(true);

            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .order('created_at', { ascending: false })
                .range(pageNumber * STORIES_PER_PAGE, (pageNumber + 1) * STORIES_PER_PAGE - 1);

            if (error) throw error;

            if (data) {
                if (data.length < STORIES_PER_PAGE) setHasMore(false);
                setStories(prev => pageNumber === 0 ? data : [...prev, ...data]);
            }
        } catch (error) {
            console.error('Error fetching full stories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories(0);
    }, []);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchStories(nextPage);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#F7E9D3] overflow-y-auto animate-fadeIn">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex justify-between items-center mb-12 sticky top-0 bg-[#F7E9D3]/95 backdrop-blur-sm py-4 z-10 border-b border-brewasa-dark/10">
                    <div>
                        <h2 className="text-2xl font-bold text-brewasa-dark">Semua Cerita</h2>
                        <p className="text-brewasa-dark/60 text-sm">Arsip rindu dan rasa.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-brewasa-dark text-white rounded-full hover:bg-brewasa-copper transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Grid */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 mb-12">
                    {stories.map((story) => (
                        <div key={story.id} className="break-inside-avoid bg-white p-6 rounded-2xl shadow-sm border border-brewasa-dark/5">
                            <p className="text-brewasa-dark/80 italic font-serif text-lg leading-relaxed mb-6">
                                "{story.message}"
                            </p>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                <div>
                                    <p className="font-bold text-brewasa-dark text-sm">{story.name || 'Anonim'}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: idLocale })}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onLike(story.id)}
                                    className={`flex items-center gap-1 transition-colors px-3 py-1 rounded-full ${likedStoryIds.includes(story.id) ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                >
                                    <Heart className={`w-4 h-4 ${likedStoryIds.includes(story.id) ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-medium">{story.likes}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More */}
                {hasMore && !loading && (
                    <div className="text-center pb-12">
                        <button
                            onClick={loadMore}
                            className="px-8 py-3 border border-brewasa-dark/20 text-brewasa-dark rounded-full hover:bg-brewasa-dark hover:text-white transition-all font-medium"
                        >
                            Muat Lebih Banyak
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-12 text-brewasa-dark/50">Memuat cerita...</div>
                )}

                {!hasMore && stories.length > 0 && (
                    <div className="text-center py-12 text-brewasa-dark/30 text-sm">Semua cerita telah ditampilkan.</div>
                )}

            </div>
        </div>
    );
};

export default FullCerita;
