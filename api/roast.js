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
    return res.status(400).json({ error: isEN ? 'No bio or photo provided.' : 'Kein Bio-Text oder Foto angegeben.' });
  }

  const p = platform || 'Tinder';

  const platformTips = {
    Tinder: {
      de: 'Tinder ist foto-getrieben – 80% der Entscheidung fällt durch das erste Foto. Fokus: Erstes Foto, Fotoqualität, kurze Bio mit Gesprächsstarter.',
      en: 'Tinder is photo-driven – 80% of the swipe decision is based on the first photo. Focus: first photo quality, overall photos, short punchy bio with a conversation hook.'
    },
    Bumble: {
      de: 'Auf Bumble müssen Frauen zuerst schreiben – Gesprächsstarter in der Bio sind entscheidend. Fokus: konkrete Aufhänger, einladendes Profil, Persönlichkeit.',
      en: 'On Bumble women message first – conversation hooks are critical. Focus: concrete things she can mention, approachable vibe, personality over looks.'
    },
    Hinge: {
      de: 'Hinge ist auf ernsthafte Beziehungen ausgelegt – Prompts oft wichtiger als Bio. Fokus: spezifische Prompt-Antworten, keine Klischees, Neugier wecken.',
      en: 'Hinge is for serious relationships – prompts often matter more than the bio. Focus: specific non-cliché prompt answers, photos showing different sides, spark curiosity.'
    },
    OkCupid: {
      de: 'OkCupid-Nutzer lesen wirklich – ausführliche authentische Bio. Fokus: echte Persönlichkeit zeigen, authentischer Stil, Kompatibilität erkennbar machen.',
      en: 'OkCupid users actually read profiles – detailed authentic bio matters. Focus: real personality, genuine writing style, enough detail for compatibility assessment.'
    },
    Sonstige: { de: 'Allgemeine Analyse.', en: 'General analysis.' }
  };

  const tip = (platformTips[p] || platformTips['Sonstige'])[isEN ? 'en' : 'de'];
  const bioText = bio ? `\n\nBio: "${bio}"` : '';
  const hasImages = images && images.length > 0;
  const imgNote = hasImages ? `\n\n(${images.length} Foto(s) hochgeladen)` : '';

  const system = isEN
    ? `You are a brutally honest dating coach reviewing a ${p} profile. Be casual, funny, direct. RULE: English ONLY. No Chinese, no German. Return ONLY valid JSON with no markdown or explanation.`
    : `Du bist ein ehrlicher Dating-Coach der ein ${p}-Profil bewertet. Locker, witzig, direkt. REGEL: Nur Deutsch. Kein Chinesisch. Nur valides JSON ohne Markdown.`;

  const exFull = isEN
    ? `{"score":5.2,"headline":"Decent but invisible","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"Your first photo is a group shot which makes it impossible to tell who you are."}],"bio_versions":[{"label":"Funny & confident","text":"..."},{"label":"Direct & interesting","text":"..."},{"label":"Mysterious","text":"..."}]}`
    : `{"score":5.2,"headline":"Solide aber unsichtbar","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"Dein erstes Foto ist ein Gruppenfoto was es unmöglich macht dich zuzuordnen."}],"bio_versions":[{"label":"Witzig & selbstbewusst","text":"..."},{"label":"Direkt & interessant","text":"..."},{"label":"Geheimnisvoll","text":"..."}]}`;

  const exMini = isEN
    ? `{"score":5.2,"headline":"Decent but invisible","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"..."},{"emoji":"✍️","category":"Bio","severity":"medium","text":"..."},{"emoji":"💡","category":"Conversation Starter","severity":"low","text":"..."}]}`
    : `{"score":5.2,"headline":"Solide aber unsichtbar","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"..."},{"emoji":"✍️","category":"Bio","severity":"mittel","text":"..."},{"emoji":"💡","category":"Gesprächsstarter","severity":"niedrig","text":"..."}]}`;

  const prompt = isEN
    ? `Platform: ${p}\nFocus: ${tip}${bioText}${imgNote}\n\nScore honestly (most profiles 3-7, weak 2-4, good 7-8). ${isFull ? 'Give 8-12 roast_items.' : 'Give EXACTLY 3 roast_items.'}\n\nReturn ONLY JSON like this example:\n${isFull ? exFull : exMini}`
    : `Plattform: ${p}\nFokus: ${tip}${bioText}${imgNote}\n\nScore ehrlich (die meisten 3-7, schwach 2-4, gut 7-8). ${isFull ? 'Gib 8-12 roast_items.' : 'Gib GENAU 3 roast_items.'}\n\nGib NUR JSON wie dieses Beispiel zurück:\n${isFull ? exFull : exMini}`;

  // Try models in order, with and without images
  const models = ['kimi-k2.5', 'moonshot-v1-32k', 'moonshot-v1-8k'];
  const attempts = hasImages
    ? [{ useImages: true }, { useImages: false }]  // try with images first, then text only
    : [{ useImages: false }];

  let lastError = '';

  for (const { useImages } of attempts) {
    for (const model of models) {
      try {
        let userContent;
        if (useImages && imageMimeTypes) {
          userContent = [
            { type: 'text', text: prompt },
            ...images.slice(0, 2).map((img, i) => ({
              type: 'image_url',
              image_url: { url: `data:${imageMimeTypes[i] || 'image/jpeg'};base64,${img}` }
            }))
          ];
        } else {
          userContent = prompt;
        }

        const apiRes = await fetch('https://api.moonshot.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`
          },
          body: JSON.stringify({
            model,
            max_tokens: isFull ? 3000 : 1000,
            temperature: 1,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userContent }
            ]
          })
        });

        if (!apiRes.ok) {
          lastError = `Model ${model}: HTTP ${apiRes.status}`;
          console.error(lastError, await apiRes.text().catch(() => ''));
          continue;
        }

        const data = await apiRes.json();
        const raw = (data.choices?.[0]?.message?.content || '').replace(/```json/g, '').replace(/```/g, '').trim();

        if (!raw) { lastError = 'Empty response'; continue; }

        // Reject Chinese
        if (/[\u4e00-\u9fff\u3400-\u4dbf]/u.test(raw)) {
          lastError = 'Chinese characters detected';
          console.error(lastError);
          continue;
        }

        const parsed = JSON.parse(raw);
        if (!parsed.score || !Array.isArray(parsed.roast_items) || parsed.roast_items.length === 0) {
          lastError = 'Invalid JSON structure';
          continue;
        }

        return res.status(200).json(parsed);

      } catch (e) {
        lastError = `${model}: ${e.message}`;
        console.error('Attempt failed:', lastError);
      }
    }
  }

  console.error('All attempts failed. Last error:', lastError);
  return res.status(502).json({
    error: isEN
      ? 'The AI service is currently unavailable. Please try again in a moment.'
      : 'Der KI-Service ist gerade nicht erreichbar. Bitte in einem Moment nochmal versuchen.'
  });
};
