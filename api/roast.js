// api/roast.js
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, bio, images, imageMimeTypes, isFull, lang } = req.body;
  const isEN = lang === 'en';

  if (!bio && (!images || images.length === 0)) {
    return res.status(400).json({ error: isEN ? 'No bio text or photo provided.' : 'Kein Bio-Text oder Foto angegeben.' });
  }

  const imageHint = (images && images.length > 0)
    ? (isEN ? `\n\n(The user uploaded ${images.length} profile photo(s).)` : `\n\n(Der User hat ${images.length} Profilfoto(s) hochgeladen.)`)
    : '';
  const bioText = bio ? `\n\nBio:\n"${bio}"` : (isEN ? '\n\n(No bio text provided)' : '\n\n(Kein Bio-Text angegeben)');

  const systemPrompt = isEN
    ? `You are a brutally honest friend reviewing the user's ${platform||'Tinder'} profile. Tone: casual, direct, funny but never cruel. CRITICAL RULE: Respond ONLY in English. NEVER use Chinese, German, or any other language. Not even a single character. Respond ONLY with valid JSON, no markdown, no backticks.`
    : `Du bist ein ehrlicher Freund der dem User sein ${platform||'Tinder'}-Profil kommentiert. Ton: locker, direkt, witzig. KRITISCHE REGEL: Antworte AUSSCHLIESSLICH auf Deutsch. NIEMALS Chinesisch oder andere Sprachen verwenden. Kein einziges fremdsprachiges Zeichen. Antworte NUR mit validem JSON, kein Markdown, keine Backticks.`;

  const jsonFull = isEN
    ? `{"score":<1.0-10.0>,"headline":"max 8 words funny","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-4 sentences"}],"bio_versions":[{"label":"Funny & confident","text":"new bio"},{"label":"Direct & interesting","text":"new bio"},{"label":"Mysterious","text":"new bio"}]}`
    : `{"score":<1.0-10.0>,"headline":"max 8 Wörter witzig","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-4 Sätze"}],"bio_versions":[{"label":"Witzig & selbstbewusst","text":"neue Bio"},{"label":"Direkt & interessant","text":"neue Bio"},{"label":"Geheimnisvoll","text":"neue Bio"}]}`;

  const jsonMini = isEN
    ? `{"score":<1.0-10.0>,"headline":"max 8 words funny","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-3 sentences"}]}`
    : `{"score":<1.0-10.0>,"headline":"max 8 Wörter witzig","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-3 Sätze"}]}`;

  const scoreTip = isEN
    ? 'Score honestly: most profiles 3-7, weak 2-4, strong 7-8, exceptional 8-9. Give 8-12 items.'
    : 'Score ehrlich: die meisten Profile 3-7, schwach 2-4, stark 7-8, ausnahmsweise 8-9. Gib 8-12 Items.';

  const scoreTipMini = isEN
    ? 'Score honestly: most profiles 3-7. Exactly 3 items.'
    : 'Score ehrlich: die meisten Profile 3-7. Genau 3 Items.';

  const prompt = `Platform: ${platform||'Tinder'}${bioText}${imageHint}\n\n${isFull ? scoreTip : scoreTipMini}\n\nRespond ONLY with this JSON:\n${isFull ? jsonFull : jsonMini}\n\n${isEN ? 'EVERY word must be in English. No other language allowed.' : 'JEDES Wort muss auf Deutsch sein. Keine andere Sprache erlaubt.'}`;

  try {
    let response, lastErr;
    for (const model of ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k']) {
      try {
        const userContent = (images && images.length > 0 && imageMimeTypes)
          ? [{ type: 'text', text: prompt }, ...images.slice(0,2).map((img,i) => ({ type: 'image_url', image_url: { url: `data:${imageMimeTypes[i]||'image/jpeg'};base64,${img}` } }))]
          : prompt;

        response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}` },
          body: JSON.stringify({ model, max_tokens: isFull ? 3000 : 1000, temperature: 1,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }] })
        });
        if (response.ok) break;
        lastErr = await response.text();
      } catch(e) { lastErr = e.message; }
    }

    if (!response || !response.ok) return res.status(502).json({ error: isEN ? 'AI service unavailable.' : 'KI-Service nicht erreichbar.' });

    const data = await response.json();
    let text = (data.choices?.[0]?.message?.content || '').replace(/```json/g,'').replace(/```/g,'').trim();

    // Reject Chinese characters
    if (/[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}]/u.test(text)) {
      return res.status(502).json({ error: isEN ? 'Invalid response, please try again.' : 'Ungültige Antwort, bitte nochmal versuchen.' });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error('Roast error:', err);
    return res.status(500).json({ error: isEN ? 'Something went wrong.' : 'Fehler. Bitte nochmal versuchen.' });
  }
}
