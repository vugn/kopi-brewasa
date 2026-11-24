const BUSY = 'Barista kami sedang sibuk menyeduh. Silakan pilih sesuai kata hatimu.';

// Panggilan lewat /api/barista (server) supaya kunci Gemini tidak terbuka di browser.
export const getCoffeeRecommendation = async (mood: string): Promise<string> => {
  try {
    const res = await fetch('/api/barista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood }),
    });
    if (res.status === 429) return 'Barista kami lagi ramai, coba lagi sebentar ya.';
    const data = await res.json().catch(() => null);
    return res.ok && typeof data?.text === 'string' ? data.text : BUSY;
  } catch {
    return BUSY;
  }
};
