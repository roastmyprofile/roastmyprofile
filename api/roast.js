// api/roast.js
// Vercel Serverless Function – Kimi K2.5 API (OpenAI-kompatibel)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, bio, images, imageMimeTypes, isFull } = req.body;

  if (!bio && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Kein Bio-Text oder Foto angegeben.' });
  }

  // Kimi K2.5 nutzt OpenAI-Format: image_url mit base64
  const userContent = [];

  if (images && images.length > 0) {
    images.slice(0, 3).forEach((imgData, idx) => {
      if (imgData) {
        const mimeType = imageMimeTypes?.[idx] || 'image/jpeg';
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imgData}` }
        });
      }
    });
  }

  const bioText = bio ? `\n\nBio/Profiltext:\n"${bio}"` : '\n\n(Kein Bio-Text angegeben)';
  const systemPrompt = `Du bist ein brutell ehrlicher, witziger Dating-Profil-Coach auf Deutsch für ${platform || 'Tinder'}. Dein Ton ist wie ein guter Freund der kein Blatt vor den Mund nimmt. Antworte NUR mit validem JSON ohne Markdown oder Backticks.`;

  if (!isFull) {
    userContent.push({
      type: 'text',
      text: `Plattform: ${platform || 'Tinder'}${bioText}\n\nAnalysiere dieses Dating-Profil und gib einen Mini-Roast zurück.\nNUR dieses JSON (kein Markdown):\n{\n  "score": <1.0-10.0>,\n  "headline": <witziger Satz max 8 Wörter>,\n  "roast_items": [\n    { "emoji": <Emoji>, "category": <Kategorie>, "severity": <"hoch"|"mittel"|"niedrig">, "text": <2-3 Sätze witzig> }\n  ]\n}\nExakt 3 roast_items. Deutsch.`
    });
  } else {
    userContent.push({
      type: 'text',
      text: `Plattform: ${platform || 'Tinder'}${bioText}\n\nVollständige Analyse. NUR dieses JSON (kein Markdown):\n{\n  "score": <1.0-10.0>,\n  "headline": <witziger Satz>,\n  "roast_items": [\n    { "emoji": <Emoji>, "category": <Kategorie>, "severity": <"hoch"|"mittel"|"niedrig">, "text": <2-4 Sätze mit Tipp> }\n  ],\n  "bio_versions": [\n    { "label": "Witzig & selbstbewusst", "text": <Bio> },\n    { "label": "Direkt & interessant", "text": <Bio> },\n    { "label": "Geheimnisvoll", "text": <Bio> }\n  ]\n}\n8-12 roast_items. Deutsch. Konkret.`
    });
  }

  try {
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        max_tokens: isFull ? 3000 : 1000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Kimi API error:', err);
      return res.status(500).json({ error: 'KI-Analyse fehlgeschlagen. Bitte erneut versuchen.' });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('JSON parse failed');
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Roast API error:', err);
    return res.status(500).json({ error: 'Fehler aufgetreten. Bitte erneut versuchen.' });
  }
}
