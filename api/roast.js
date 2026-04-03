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

  const p = platform || 'Tinder';

  const platformContext = {
    Tinder: {
      de: 'Tinder ist extrem foto-getrieben – 80% der Entscheidung fällt durch das erste Foto in 1-2 Sekunden. Fokus auf: 1) Erstes Foto (klares Einzelbild? Lächeln? Gutes Licht?), 2) Fotoqualität insgesamt, 3) Bio kurz und mit sofortigem Gesprächsstarter.',
      en: 'Tinder is extremely photo-driven – 80% of the decision happens in 1-2 seconds based on the first photo. Focus on: 1) First photo (clear solo shot? Smiling? Good lighting?), 2) Overall photo quality, 3) Bio short and punchy with an instant conversation starter.'
    },
    Bumble: {
      de: 'Auf Bumble müssen Frauen als erstes schreiben – daher sind Gesprächsstarter in der Bio entscheidend. Fokus auf: 1) Konkrete Aufhänger die Frauen ansprechen können, 2) Einladendes, zugängliches Profil, 3) Fotos die Persönlichkeit zeigen.',
      en: 'On Bumble women must message first – so conversation hooks in the bio are crucial. Focus on: 1) Concrete hooks women can use to start a conversation, 2) Inviting, approachable profile, 3) Photos showing personality not just looks.'
    },
    Hinge: {
      de: 'Hinge ist auf ernsthafte Beziehungen ausgelegt – Prompts sind hier oft wichtiger als die Bio. Fokus auf: 1) Prompt-Antworten (witzig, spezifisch, authentisch – keine Klischees!), 2) Verschiedene Seiten der Persönlichkeit in Fotos, 3) Neugier wecken.',
      en: 'Hinge is designed for serious relationships – prompts are often more important than the bio here. Focus on: 1) Prompt answers (funny, specific, authentic – no clichés!), 2) Photos showing different sides of personality, 3) Creating curiosity about the person.'
    },
    OkCupid: {
      de: 'OkCupid hat die ausführlichsten Profile – Nutzer lesen hier wirklich. Fokus auf: 1) Ausführliche Bio die echte Persönlichkeit zeigt (mehr als auf Tinder erlaubt), 2) Authentischer Schreibstil, 3) Genug Details für Kompatibilitäts-Einschätzung.',
      en: 'OkCupid has the most detailed profiles – users actually read here. Focus on: 1) Detailed bio showing real personality (more writing encouraged vs Tinder), 2) Authentic writing style, 3) Enough detail for compatibility assessment.'
    },
    Sonstige: {
      de: 'Allgemeine Dating-App Analyse.',
      en: 'General dating app analysis.'
    }
  };

  const ctx = platformContext[p] || platformContext['Sonstige'];
  const platformTip = isEN ? (ctx.en || ctx.de) : ctx.de;

  const systemPrompt = isEN
    ? `You are a brutally honest friend reviewing a ${p} dating profile. Be casual, direct, funny but never cruel. CRITICAL: Respond ONLY in English. Never use Chinese, German, or any other language. Respond ONLY with valid JSON – no markdown, no backticks, no explanation outside JSON.`
    : `Du bist ein ehrlicher Freund der ein ${p}-Dating-Profil kommentiert. Locker, direkt, witzig aber nicht gemein. WICHTIG: Antworte AUSSCHLIESSLICH auf Deutsch. Niemals Chinesisch oder andere Sprachen. Antworte NUR mit validem JSON – kein Markdown, keine Backticks, keine Erklärungen außerhalb des JSON.`;

  const bioText = bio ? `\n\nBio: "${bio}"` : (isEN ? '\n\n(No bio provided)' : '\n\n(Keine Bio angegeben)');
  const hasImages = images && images.length > 0;
  const imageHint = hasImages
    ? (isEN ? `\n\n(${images.length} profile photo(s) uploaded)` : `\n\n(${images.length} Profilfoto(s) hochgeladen)`)
    : '';

  const jsonTemplateFull = isEN
    ? `{"score":6.5,"headline":"Short funny headline max 8 words","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-4 sentences of feedback"},{"emoji":"✍️","category":"Bio","severity":"medium","text":"2-4 sentences"}],"bio_versions":[{"label":"Funny & confident","text":"new bio text"},{"label":"Direct & interesting","text":"new bio text"},{"label":"Mysterious","text":"new bio text"}]}`
    : `{"score":6.5,"headline":"Kurzer witziger Satz max 8 Wörter","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-4 Sätze Feedback"},{"emoji":"✍️","category":"Bio","severity":"mittel","text":"2-4 Sätze"}],"bio_versions":[{"label":"Witzig & selbstbewusst","text":"neue Bio"},{"label":"Direkt & interessant","text":"neue Bio"},{"label":"Geheimnisvoll","text":"neue Bio"}]}`;

  const jsonTemplateMini = isEN
    ? `{"score":6.5,"headline":"Short funny headline max 8 words","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-3 sentences"},{"emoji":"✍️","category":"Bio","severity":"medium","text":"2-3 sentences"},{"emoji":"💡","category":"Conversation Starter","severity":"low","text":"2-3 sentences"}]}`
    : `{"score":6.5,"headline":"Kurzer witziger Satz max 8 Wörter","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-3 Sätze"},{"emoji":"✍️","category":"Bio","severity":"mittel","text":"2-3 Sätze"},{"emoji":"💡","category":"Gesprächsstarter","severity":"niedrig","text":"2-3 Sätze"}]}`;

  const scoringTip = isEN
    ? 'Scoring: most profiles 3–7, weak 2–4, good 7–8, exceptional 8–9. Be honest, not generous.'
    : 'Score: die meisten Profile 3–7, schwach 2–4, gut 7–8, ausnahmsweise 8–9. Ehrlich bleiben.';

  const prompt = isEN
    ? `Platform: ${p}\nPlatform-specific focus: ${platformTip}${bioText}${imageHint}\n\n${scoringTip}\n${isFull ? 'Give 8–12 roast_items.' : 'Give EXACTLY 3 roast_items.'}\n\nRespond with ONLY this JSON structure (fill in real values):\n${isFull ? jsonTemplateFull : jsonTemplateMini}\n\nAll text MUST be in English only.`
    : `Plattform: ${p}\nPlattform-Fokus: ${platformTip}${bioText}${imageHint}\n\n${scoringTip}\n${isFull ? 'Gib 8–12 roast_items.' : 'Gib GENAU 3 roast_items.'}\n\nAntworte NUR mit dieser JSON-Struktur (echte Werte eintragen):\n${isFull ? jsonTemplateFull : jsonTemplateMini}\n\nAller Text MUSS auf Deutsch sein.`;

  const tryWithImages = hasImages && imageMimeTypes;

  async function callKimi(withImages) {
    for (const model of ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k']) {
      try {
        let userContent = prompt;
        if (withImages) {
          userContent = [
            { type: 'text', text: prompt },
            ...images.slice(0, 2).map((img, i) => ({
              type: 'image_url',
              image_url: { url: `data:${(imageMimeTypes && imageMimeTypes[i]) || 'image/jpeg'};base64,${img}` }
            }))
          ];
        }

        const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || '';
        }
      } catch (e) {
        console.error(`Model ${model} failed:`, e.message);
      }
    }
    return null;
  }

  try {
    // Try with images first, fall back to text-only if it fails
    let rawText = await callKimi(tryWithImages);
    if (!rawText && tryWithImages) {
      console.log('Retrying without images...');
      rawText = await callKimi(false);
    }

    if (!rawText) {
      return res.status(502).json({ error: isEN ? 'AI service unavailable. Please try again.' : 'KI-Service nicht erreichbar. Bitte nochmal versuchen.' });
    }

    // Clean response
    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Reject Chinese characters
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/u.test(text)) {
      return res.status(502).json({ error: isEN ? 'Invalid response. Please try again.' : 'Ungültige Antwort. Bitte nochmal versuchen.' });
    }

    const parsed = JSON.parse(text);

    // Validate
    if (!parsed.score || !Array.isArray(parsed.roast_items) || parsed.roast_items.length === 0) {
      throw new Error('Invalid structure');
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Roast error:', err.message);
    return res.status(500).json({ error: isEN ? 'Something went wrong. Please try again.' : 'Fehler. Bitte nochmal versuchen.' });
  }
}
