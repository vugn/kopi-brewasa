import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Megaphone, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Announcement {
    id: number;
    message: string;
    is_active: boolean;
}

const AnnouncementManager: React.FC = () => {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [message, setMessage] = useState('');
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        fetchAnnouncement();
    }, []);

    const fetchAnnouncement = async () => {
        setLoading(true);
        // Fetches the most recent announcement
        const { data } = await supabase
            .from('announcements')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setAnnouncement(data);
            setMessage(data.message);
            setIsActive(data.is_active);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);

        // We update the existing one or create new if doesn't exist.
        // Ideally we just keep one record ID=1 for simplicity in this MVP.
        // Or we insert a new record to keep history.

        // Strategy: Upcert (Update or Insert) on a fixed Logic?
        // Let's just insert a new one for logs, and strictly fetch the latest active one in the frontend.

        const { error } = await supabase
            .from('announcements')
            .insert([{ message, is_active: isActive }]);

        if (error) {
            alert('Gagal menyimpan: ' + error.message);
        } else {
            alert('Pengumuman berhasil diupdate!');
            fetchAnnouncement();
        }
        setSaving(false);
    };

    return (
        <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-brewasa-dark mb-8">Announcement Bar</h2>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Pesan Pengumuman</label>
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Contoh: Diskon 20% untuk pelajar setiap Senin!"
                        className="w-full p-4 border rounded-xl text-lg focus:ring-2 focus:ring-brewasa-copper/50 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-2">Akan muncul di bagian paling atas website.</p>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl mb-8">
                    <span className="font-bold text-gray-700">Status Aktif</span>
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                    >
                        {isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        {isActive ? 'Aktif' : 'Tidak Aktif'}
                    </button>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-brewasa-copper text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Megaphone className="w-5 h-5" />}
                    <span>Update Pengumuman</span>
                </button>

            </div>

            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm leading-relaxed">
                <strong>Note:</strong> Pastikan pesan singkat dan jelas. Pengumuman yang baik bisa meningkatkan penjualan hingga 15%.
            </div>
        </div>
    );
};

export default AnnouncementManager;
