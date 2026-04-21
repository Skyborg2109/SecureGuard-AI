
const apiKey = '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';
const text = 'my email is bad@gmail.com and password 12345';
const basePrompt = 'Identifikasi informasi sensitif dalam teks berikut. Kembalikan HANYA array JSON berisi objek dengan field text, type, dan reason. Teks untuk dianalisis:';
const prompt = basePrompt + ' ' + text;
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [{ role: 'user', content: prompt }]
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(e => console.error(e));

