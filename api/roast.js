// api/roast.js
// Vercel Serverless Function – Moonshot API

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, bio, images, isFull } = req.body;

  if (!bio && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Kein Bio-Text oder Foto angegeben.' });
  }

  const imageHint = (images && images.length > 0)
    ? `\n\n(Der User hat ${images.length} Profilfoto(s) hochgeladen.)`
    : '';

  const bioText = bio ? `\n\nBio:\n"${bio}"` : '\n\n(Kein Bio-Text angegeben)';

  const systemPrompt = `Du bist ein brutell ehrlicher, witziger Dating-Profil-Coach auf Deutsch fuer ${platform || 'Tinder'}. Antworte NUR mit validem JSON ohne Markdown oder Backticks.`;

  const prompt = isFull
    ? `Plattform: ${platform || 'Tinder'}${bioText}${imageHint}\n\nVollstaendige Analyse als JSON:\n{"score":7.5,"headline":"Kurzer witziger Satz","roast_items":[{"emoji":"🔥","category":"Bio","severity":"hoch","text":"Kommentar hier"}],"bio_versions":[{"label":"Witzig und selbstbewusst","text":"Bio hier"},{"label":"Direkt und interessant","text":"Bio hier"},{"label":"Geheimnisvoll","text":"Bio hier"}]}\n\nGib 8-12 roast_items zurueck. Alles auf Deutsch.`
    : `Plattform: ${platform || 'Tinder'}${bioText}${imageHint}\n\nMini-Roast als JSON:\n{"score":6.5,"headline":"Kurzer witziger Satz","roast_items":[{"emoji":"🔥","category":"Bio","severity":"hoch","text":"Kommentar hier"}]}\n\nGib genau 3 roast_items zurueck. Alles auf Deutsch.`;

  try {
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        max_tokens: isFull ? 3000 : 1000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Moonshot API error:', JSON.stringify(err));
      return res.status(500).json({ error: 'KI-Analyse fehlgeschlagen. Bitte erneut versuchen.' });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    console.log('Raw response:', rawText.substring(0, 150));

    let clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonStart = clean.indexOf('{');
    const jsonEnd = clean.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      clean = clean.substring(jsonStart, jsonEnd + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('JSON parse failed:', clean.substring(0, 300));
      return res.status(500).json({ error: 'KI-Antwort ungueltig. Bitte nochmal versuchen.' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Roast handler error:', err.message);
    return res.status(500).json({ error: 'Serverfehler. Bitte erneut versuchen.' });
  }
};
