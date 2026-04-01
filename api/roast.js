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

  const systemPrompt = `Du bist ein guter Freund der sich mit Dating auskennt und dem User gerade sein ${platform || 'Tinder'}-Profil kommentiert. Dein Ton: locker, direkt, witzig aber nie gemein. Du redest wie ein echter Mensch auf Deutsch – kein Übersetzer-Deutsch, kein KI-Sprech. Keine englischen Begriffe übersetzen (also NICHT "rote Flagge" oder "rotes Flag" – sag einfach "das ist ein Problem"). Kein "Grüße" oder förmliches Zeugs. Einfach ehrliches Feedback wie unter Kumpels. Antworte NUR mit validem JSON ohne Markdown oder Backticks.`;

  const prompt = isFull
    ? `Plattform: ${platform || 'Tinder'}${bioText}${imageHint}

Analysiere dieses Dating-Profil komplett. Schreib wie ein Freund der kein Blatt vor den Mund nimmt – locker, konkret, auf Deutsch wie man wirklich spricht.

WICHTIG für den Score: Sei ehrlich und realistisch. Die meisten Profile liegen zwischen 3 und 7. Nur wirklich starke Profile bekommen über 8. Schwache Profile bekommen 2-4. Vergib den Score der wirklich passt – nicht immer Mitte.

Antworte NUR mit diesem JSON (keine Erklärungen drumrum):
{"score":<ehrliche Zahl zwischen 1.0 und 10.0>,"headline":"Kurzer witziger Satz max 8 Wörter","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-4 Sätze konkretes Feedback wie ein Freund es sagen würde"}],"bio_versions":[{"label":"Witzig & selbstbewusst","text":"komplett neue Bio"},{"label":"Direkt & interessant","text":"komplett neue Bio"},{"label":"Geheimnisvoll","text":"komplett neue Bio"}]}

Gib 8-12 roast_items zurück. Alles auf natürlichem Deutsch – kein Übersetzerdeutsch.`
    : `Plattform: ${platform || 'Tinder'}${bioText}${imageHint}

Gib einen kurzen ehrlichen Kommentar zu diesem Dating-Profil. Schreib wie ein Freund – locker, direkt, auf Deutsch wie man wirklich redet.

WICHTIG für den Score: Sei ehrlich. Die meisten Profile liegen zwischen 3 und 7. Vergib den Score der wirklich passt – nicht immer Mitte. Schlechte Profile bekommen 2-4, gute 7-8, sehr gute 8-9.

Antworte NUR mit diesem JSON (keine Erklärungen drumrum):
{"score":<ehrliche Zahl zwischen 1.0 und 10.0>,"headline":"Kurzer witziger Satz max 8 Wörter","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-3 Sätze ehrliches Feedback wie ein Freund es sagen würde"}]}

Genau 3 roast_items. Alles auf natürlichem Deutsch – kein Übersetzerdeutsch, kein KI-Sprech.`;

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
