import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Plus, Trash2, StickyNote, Pin } from 'lucide-react';

interface Note {
    id: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
}

const NotesManager: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin_notes')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notes:', error);
        } else {
            setNotes(data || []);
        }
        setLoading(false);
    };

    const addNote = async () => {
        if (!newNote.trim()) return;

        const { data, error } = await supabase
            .from('admin_notes')
            .insert([{ content: newNote }])
            .select()
            .single();

        if (error) {
            alert('Gagal menambah catatan: ' + error.message);
        } else {
            setNotes([data, ...notes]);
            setNewNote('');
        }
    };

    const deleteNote = async (id: string) => {
        if (!confirm('Hapus catatan ini?')) return;

        const { error } = await supabase
            .from('admin_notes')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Gagal menghapus: ' + error.message);
        } else {
            setNotes(notes.filter(n => n.id !== id));
        }
    };

    const togglePin = async (note: Note) => {
        const { error } = await supabase
            .from('admin_notes')
            .update({ is_pinned: !note.is_pinned })
            .eq('id', note.id);

        if (error) {
            alert('Gagal update status pin: ' + error.message);
        } else {
            // Re-fetch to sort correctly
            fetchNotes();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-brewasa-dark flex items-center gap-2">
                    <StickyNote className="w-6 h-6" /> Catatan Admin
                </h2>
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <textarea
                    className="w-full p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl focus:ring-2 focus:ring-brewasa-copper/20 outline-none resize-none min-h-[100px]"
                    placeholder="Tulis catatan baru di sini..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-brewasa-dark text-white rounded-lg font-bold hover:bg-brewasa-copper transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Tambah Catatan
                    </button>
                </div>
            </div>

            {/* Notes Grid */}
            {loading ? (
                <div className="text-center py-10">Loading notes...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.map(note => (
                        <div
                            key={note.id}
                            className={`p-5 rounded-xl border relative group transition-all hover:shadow-md ${note.is_pinned
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-white border-gray-100'
                                }`}
                        >
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => togglePin(note)}
                                    className={`p-1.5 rounded-full hover:bg-black/5 ${note.is_pinned ? 'text-brewasa-copper' : 'text-gray-400'}`}
                                    title={note.is_pinned ? "Unpin" : "Pin"}
                                >
                                    <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                    onClick={() => deleteNote(note.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                    title="Hapus"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed mb-4">
                                {note.content}
                            </p>

                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <span>{new Date(note.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span>•</span>
                                <span>{new Date(note.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Belum ada catatan.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotesManager;
