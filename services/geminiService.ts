import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getCoffeeRecommendation = async (mood: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Maaf, Barista AI sedang istirahat (API Key missing). Cobalah 'Latte Jeda' untuk menenangkan pikiran.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User mood: ${mood}`,
      config: {
        systemInstruction: `You are the philosophical barista of "Kopi Brewasa". 
        Your tone is poetic, warm, minimalist, and wise.
        
        We have 3 signature drinks:
        1. "Kopi Renjana" (Americano/Long Black) - For when they need focus, logic, or are feeling determined. Pahit, tegas.
        2. "Latte Jeda" (Aren Latte) - For when they are tired, stressed, or need a hug. Manis yang pas, istirahat.
        3. "Berry Refleksi" (Mocktail Coffee) - For when they are bored, seeking inspiration, or want something new. Segar, perspektif baru.

        Based on the user's mood, recommend ONE of these drinks. 
        Give a short, poetic reason why (max 2 sentences). 
        Do not use markdown formatting like bold or italics.
        Language: Indonesian.`,
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });

    return response.text || "Sepertinya semua menu kami cocok untukmu hari ini.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Barista kami sedang sibuk menyeduh. Silakan pilih sesuai kata hatimu.";
  }
};