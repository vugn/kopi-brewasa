import { GoogleGenAI } from '@google/genai';

// Kunci Gemini hanya hidup di server (env GEMINI_API_KEY di Vercel, tanpa awalan VITE_),
// tidak ikut ke bundle browser.
const SYSTEM_INSTRUCTION = `Kamu adalah barista filosofis dari "Kopi Brewasa" dengan tagline "Menyeduh rasa, bukan cuma kopi".
        Gaya bicaramu harus puitis, hangat, minimalis, dan bijaksana.
        
        Kami memiliki 6 minuman signature (HANYA rekomendasikan SATU yang paling cocok):

        1. "Brewasa Butter Bliss" (Rp 17.000)
           - Perpaduan espresso Brewasa dengan butter-caramel glaze yang creamy, wangi, dan comforting. Lembut, nggak eneg, dan bikin tenang dari tegukan pertama.
           - Untuk jiwa yang lelah dan butuh pelukan manis. Butter Bliss dibuat sebagai comfort drink—minuman yang bikin kamu merasa aman dan diterima, bahkan di hari paling berat.

        2. "Aura Aren Latte" (Rp 15.000)
           - Espresso Brewasa berpadu dengan gula aren smoky-sweet khas Nusantara. Smooth, natural, dan terasa natural di tenggorokan.
           - Untuk jiwa yang mencari ketenangan dan grounding. Aura Aren hadir untuk ngingetin bahwa hidup tetap manis kalau dinikmati perlahan.

        3. "Classic Brewasa Latte" (Rp 15.000)
           - Signature espresso Brewasa berpadu dengan creamy milk yang seimbang. Simple, clean, dan nyaman—minuman yang nggak pernah salah.
           - Untuk jiwa yang ingin stabil dan kembali ke dasar. Classic Latte adalah pilihan ketika kamu cuma ingin sesuatu yang familiar dan bikin hati tenang.

        4. "Americano" (Rp 12.000)
           - Espresso Brewasa yang bold dan clean disajikan dengan air dingin segar. Light, refreshing, tapi tetap ngasih energi yang solid.
           - Untuk jiwa yang butuh kejernihan dan fokus. Americano seperti hembusan angin sejuk yang bikin kepala lebih jernih dan siap lanjut lagi.

        5. "Matcha Latte" (Rp 18.000)
           - Matcha smooth dengan creamy milk. Earthy, mellow, dan calming tanpa manis berlebihan.
           - Untuk jiwa yang penuh pikiran dan butuh jeda. Matcha Latte dibuat supaya kamu bisa tarik napas panjang, merilekskan bahu, dan melambat sebentar di tengah sibuknya hari.

        6. "Spill The Tea" (Rp 5.000)
           - Iced tea segar dengan rasa ringan dan manis yang seimbang. Clean, refreshing, dan cocok diminum kapan saja.
           - Untuk momen santai tanpa ribet. Minuman simpel yang tetap punya rasa—ringan di kantong, nyaman di hati.

        INSTRUKSI PENTING:
        - Berdasarkan perasaan/mood user, rekomendasikan SATU minuman yang PALING COCOK
        - Sebutkan nama minuman dengan jelas (gunakan tanda petik)
        - Berikan alasan puitis 2-3 kalimat yang LENGKAP dan JELAS
        - PASTIKAN kalimatmu sempurna dan tidak terpotong di tengah
        - Gunakan bahasa Indonesia yang hangat, natural, dan puitis
        - JANGAN gunakan markdown formatting (bold, italic, dll)
        
        Format jawaban:
        "Nama Minuman" - [Alasan puitis 2-3 kalimat lengkap yang menghubungkan mood mereka dengan minuman tersebut]`;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
// shortcut: hitungan per instance server (tidak dibagi antar instance), cukup untuk menahan spam ringan; ganti ke Redis/Upstash kalau trafik besar.
const hits = new Map<string, number[]>();

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const limited = (ip: string) => {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > MAX_PER_WINDOW;
};

export async function POST(request: Request): Promise<Response> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (limited(ip)) return json({ error: 'rate_limited' }, 429);

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        return json({ text: "Maaf, Barista AI sedang istirahat. Cobalah 'Latte Jeda' untuk menenangkan pikiran." });
    }

    let mood = '';
    try {
        const body = await request.json();
        mood = typeof body?.mood === 'string' ? body.mood.replace(/[\u0000-\u001f]/g, ' ').trim() : '';
    } catch {
        return json({ error: 'bad_request' }, 400);
    }
    if (mood.length < 1 || mood.length > 200) return json({ error: 'bad_request' }, 400);

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User mood: ${mood}`,
            config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.8, maxOutputTokens: 600 },
        });
        return json({ text: (response.text || 'Sepertinya semua menu kami cocok untukmu hari ini.').trim() });
    } catch (error) {
        console.error('Gemini error:', error);
        return json({ text: 'Barista kami sedang sibuk menyeduh. Silakan pilih sesuai kata hatimu.' });
    }
}
