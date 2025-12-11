import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Megaphone, X } from 'lucide-react';
import { error } from 'console';

const AnnouncementBar: React.FC = () => {
    const [message, setMessage] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        fetchAnnouncement();
    }, []);

    const fetchAnnouncement = async () => {
        const { data } = await supabase
            .from('announcements')
            .select('message, is_active')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        if (data && data.is_active) {
            setMessage(data.message);
            setIsVisible(true);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="bg-brewasa-copper text-white text-sm py-2 px-4 relative z-50">
            <div className="container mx-auto flex items-center justify-center gap-2 text-center pr-8">
                <Megaphone className="w-4 h-4 animate-bounce" />
                <span className="font-medium tracking-wide">{message}</span>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default AnnouncementBar;
