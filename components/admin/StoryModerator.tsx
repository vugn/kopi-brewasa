import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trash2, TrendingUp, Search, Loader2 } from 'lucide-react';

interface Story {
    id: number;
    name: string;
    message: string;
    created_at: string;
    likes: number;
}

const StoryModerator: React.FC = () => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching stories:', error);
        } else {
            setStories(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Yakin ingin menghapus cerita ini secara permanen?')) return;

        const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Gagal menghapus: ' + error.message);
        } else {
            setStories(stories.filter(s => s.id !== id));
        }
    };

    const filteredStories = stories.filter(s =>
        s.message.toLowerCase().includes(filter.toLowerCase()) ||
        s.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-brewasa-dark">Story Moderation</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        placeholder="Cari kata toxic..."
                        className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:border-brewasa-copper"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid gap-4">
                    {filteredStories.map(story => (
                        <div key={story.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start group hover:border-red-200 transition-colors">
                            <div>
                                <p className="text-gray-800 italic mb-2">"{story.message}"</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="font-bold text-brewasa-copper">{story.name}</span>
                                    <span>•</span>
                                    <span>{new Date(story.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {story.likes} Likes</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(story.id)}
                                className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Cerita"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {filteredStories.length === 0 && (
                        <p className="text-center text-gray-500 py-12">Tidak ada cerita ditemukan.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default StoryModerator;
