import React, { useState, useEffect } from 'react';
import { PenTool, Send, Heart } from 'lucide-react';

interface Story {
    id: string;
    name: string;
    message: string;
    date: string;
    likes: number;
}

const SAMPLE_STORIES: Story[] = [
    {
        id: '1',
        name: 'Anonim',
        message: 'Kopinya pahit, tapi kenangannya manis. Terima kasih sudah menemani sore yang sendu ini.',
        date: '2 jam yang lalu',
        likes: 12
    },
    {
        id: '2',
        name: 'Dinda',
        message: 'Singgah sebentar sebelum kembali ke realita. Tempat ini seperti pelukan hangat.',
        date: 'Kemarin',
        likes: 8
    },
    {
        id: '3',
        name: 'Raka',
        message: 'Hujan dan kopi, kombinasi terbaik untuk merindu someone yang jauh disana.',
        date: '2 hari yang lalu',
        likes: 24
    },
    {
        id: '4',
        name: 'Si Puitis',
        message: 'Di sudut meja ini, aku belajar bahwa jeda bukan berarti berhenti, tapi mengambil napas untuk lari lebih jauh.',
        date: 'Minggu lalu',
        likes: 15
    },
    {
        id: '5',
        name: 'Pengunjung Setia',
        message: 'Butter Bliss-nya juara! Bikin mood balik lagi.',
        date: 'Minggu lalu',
        likes: 5
    }
];

const PojokCerita: React.FC = () => {
    const [stories, setStories] = useState<Story[]>(SAMPLE_STORIES);
    const [newName, setNewName] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isWriting, setIsWriting] = useState(false);

    useEffect(() => {
        const savedStories = localStorage.getItem('brewasa_stories');
        if (savedStories) {
            setStories([...JSON.parse(savedStories), ...SAMPLE_STORIES]);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const newStory: Story = {
            id: Date.now().toString(),
            name: newName.trim() || 'Anonim',
            message: newMessage,
            date: 'Baru saja',
            likes: 0
        };

        const updatedUserStories = [newStory, ...(JSON.parse(localStorage.getItem('brewasa_stories') || '[]'))];
        localStorage.setItem('brewasa_stories', JSON.stringify(updatedUserStories));

        setStories([newStory, ...stories]);
        setNewMessage('');
        setNewName('');
        setIsWriting(false);
    };

    return (
        <section id="pojok-cerita" className="py-24 bg-[#F7E9D3] relative">
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
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isWriting ? 'max-h-96 opacity-100 mb-16' : 'max-h-0 opacity-0'}`}>
                    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-brewasa-copper/20">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Namamu (Boleh kosong untuk Anonim)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-brewasa-dark"
                            />
                            <textarea
                                rows={4}
                                placeholder="Tulis ceritamu di sini..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brewasa-copper/50 text-brewasa-dark resize-none"
                            ></textarea>
                            <button
                                type="submit"
                                className="w-full py-3 bg-brewasa-copper text-white rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                <span>Kirim Cerita</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Masonry Grid Layout */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {stories.map((story) => (
                        <div key={story.id} className="break-inside-avoid bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-brewasa-dark/5">
                            <p className="text-brewasa-dark/80 italic font-serif text-lg leading-relaxed mb-6">
                                "{story.message}"
                            </p>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                <div>
                                    <p className="font-bold text-brewasa-dark text-sm">{story.name}</p>
                                    <p className="text-xs text-gray-400">{story.date}</p>
                                </div>
                                <div className="flex items-center gap-1 text-gray-400">
                                    <Heart className="w-4 h-4" />
                                    <span className="text-xs">{story.likes}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default PojokCerita;
