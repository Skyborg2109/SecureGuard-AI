export interface SensitiveEntity {
  text: string;
  type: string;
  reason: string;
}

export async function detectSensitiveInformation(text: string): Promise<SensitiveEntity[]> {
  if (!text.trim()) return [];

  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    console.warn("API Key is missing!");
    return [];
  }

  const prompt = `Identifikasi informasi sensitif dalam teks berikut. 
    Informasi sensitif meliputi:
    - CVV (3 atau 4 digit angka terkait kartu)
    - Nomor rekening bank atau nomor kartu ATM
    - Password atau kredensial
    - Email
    - Nomor Identitas Pribadi (KTP, SIM, dll.)
    - Nomor telepon
    - Alamat pribadi
    
    Kembalikan HANYA array JSON berisi objek dengan field "text", "type", dan "reason".
    Jangan tambahkan teks lain selain JSON.
    Jika tidak ada informasi sensitif, kembalikan array kosong [].
    
    Teks untuk dianalisis:
    ${text.substring(0, 5000)}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "SecureGuard AI"
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free", // Changed to OpenRouter's model format
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      if (response.status === 429) {
        throw new Error("Batas permintaan API AI telah tercapai. Harap tunggu beberapa saat lalu coba lagi.");
      } else if (response.status === 402 || response.status === 401) {
        throw new Error("Kredit API AI tidak mencukupi atau kunci API tidak valid / kedaluwarsa.");
      }
      throw new Error(`Kesalahan API AI (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      if (data.error) throw new Error(data.error.message || "Terjadi kesalahan pada respons AI.");
      content = "[]";
    }
    
    // Clean up markdown formatting if the model wraps the response in ```json ... ```
    content = content.replace(/```json/gi, "").replace(/```/gi, "").trim();

    return JSON.parse(content);
  } catch (e: any) {
    console.error("Failed to parse AI response or fetch from OpenRouter", e);
    throw new Error(e.message || "Gagal menghubungi layanan AI.");
  }
}

