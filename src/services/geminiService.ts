import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SensitiveEntity {
  text: string;
  type: string;
  reason: string;
}

export async function detectSensitiveInformation(text: string): Promise<SensitiveEntity[]> {
  if (!text.trim()) return [];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Identifikasi informasi sensitif dalam teks berikut. 
    Informasi sensitif meliputi:
    - CVV (3 atau 4 digit angka terkait kartu)
    - Nomor rekening bank atau nomor kartu ATM
    - Password atau kredensial
    - Email
    - Nomor Identitas Pribadi (KTP, SIM, dll.)
    - Nomor telepon
    - Alamat pribadi
    
    Kembalikan array JSON berisi objek dengan field "text", "type", dan "reason".
    Jika tidak ada informasi sensitif, kembalikan array kosong [].
    
    Teks untuk dianalisis:
    ${text.substring(0, 5000)}`, // Limit text size for prompt
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            type: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["text", "type", "reason"]
        }
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
}
