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
        
        We have 5 signature drinks (ONLY recommend one of these):
        1. "Brewasa Butter Bliss" (Espresso + Butter-Caramel Glaze) - Creamy, comforting. For when they need a hug.
        2. "Aura Aren Latte" (Espresso + Gula Aren) - Smoky-sweet, grounding. For when they need calm stability.
        3. "Classic Brewasa Latte" (Espresso + Milk) - Balanced, simple. For when they need to get back to basics.
        4. "Americano Breeze" (Espresso + Cold Water) - Bold, clean, refreshing. For when they need focus and clarity.
        5. "Matcha Latte" (Matcha + Milk) - Earthy, mellow. For when they need a zen pause.

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