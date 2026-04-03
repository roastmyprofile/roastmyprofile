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

  // Platform-specific context
  const platformContext = {
    Tinder: {
      de: `Tinder ist extrem foto-getrieben. 80% der Entscheidung fällt innerhalb von 1-2 Sekunden durch das erste Foto. Die Bio wird oft kaum gelesen. Fokussiere dein Feedback besonders auf: 1) Das erste Foto (ist es ein klares Einzelbild? Lächeln? Gutes Licht?), 2) Die Qualität aller Fotos, 3) Ob die Bio einen sofortigen Gesprächsstarter liefert – kurz und prägnant ist hier Trumpf.`,
      en: `Tinder is extremely photo-driven. 80% of the decision happens within 1-2 seconds based on the first photo. The bio is often barely read. Focus your feedback especially on: 1) The first photo (clear solo shot? Smiling? Good lighting?), 2) Overall photo quality, 3) Whether the bio delivers an instant conversation starter – short and punchy wins here.`
    },
    Bumble: {
      de: `Auf Bumble müssen Frauen als erstes schreiben – das macht die Bio und Gesprächsstarter noch wichtiger als auf Tinder. Männer haben oft nur wenige Stunden um zu antworten. Fokussiere besonders auf: 1) Gibt es in der Bio konkrete Aufhänger die eine Frau ansprechen kann? (Sie braucht einen Einstieg!), 2) Wirkt das Profil einladend und gesprächsbereit? 3) Fotos die Persönlichkeit zeigen nicht nur Aussehen.`,
      en: `On Bumble, women must message first – this makes the bio and conversation hooks even more important than on Tinder. Men often have only a few hours to respond. Focus especially on: 1) Does the bio have concrete hooks a woman can use to start a conversation? (She needs an opener!), 2) Does the profile feel inviting and approachable? 3) Photos that show personality, not just looks.`
    },
    Hinge: {
      de: `Hinge ist darauf ausgelegt für ernsthafte Beziehungen – "designed to be deleted". Hier sind Prompts (kurze Fragen mit Antworten) oft wichtiger als die Hauptbio. Nutzer können direkt auf einzelne Fotos oder Prompts liken und kommentieren. Fokussiere auf: 1) Sind die Prompt-Antworten witzig, spezifisch und authentisch? (Keine generischen Antworten!), 2) Zeigen die Fotos verschiedene Seiten der Persönlichkeit? 3) Macht das Profil neugierig auf die Person dahinter?`,
      en: `Hinge is designed for serious relationships – "designed to be deleted". Here, prompts (short Q&A sections) are often more important than the main bio. Users can like and comment directly on individual photos or prompts. Focus on: 1) Are the prompt answers funny, specific and authentic? (No generic answers!), 2) Do the photos show different sides of personality? 3) Does the profile make you curious about the person behind it?`
    },
    OkCupid: {
      de: `OkCupid hat die ausführlichsten Profile aller Dating-Apps – Nutzer lesen hier wirklich. Es gibt ein umfangreiches Matching-System mit Fragen. Fokussiere auf: 1) Ist die Bio ausführlich genug und zeigt sie echte Persönlichkeit? (Hier darf man mehr schreiben als auf Tinder), 2) Ist der Schreibstil authentisch und nicht generisch? 3) Gibt es genug Details damit jemand wirklich entscheiden kann ob sie passen?`,
      en: `OkCupid has the most detailed profiles of all dating apps – users actually read here. There's an extensive matching system with questions. Focus on: 1) Is the bio detailed enough and does it show real personality? (More writing is encouraged here vs. Tinder), 2) Is the writing style authentic and not generic? 3) Are there enough details for someone to genuinely assess compatibility?`
    },
    Sonstige: {
      de: `Allgemeine Dating-App Analyse.`,
      en: `General dating app analysis.`
    }
  };

  const p = platform || 'Tinder';
  const ctx = platformContext[p] || platformContext['Sonstige'];
  const platformTip = isEN ? (ctx.en || ctx.de) : ctx.de;

  const systemPrompt = isEN
    ? `You are a brutally honest friend reviewing the user's ${p} profile. Tone: casual, direct, funny but never cruel. CRITICAL RULE: Respond ONLY in English. NEVER use Chinese, German, or any other language. Not even a single character. Respond ONLY with valid JSON, no markdown, no backticks.`
    : `Du bist ein ehrlicher Freund der dem User sein ${p}-Profil kommentiert. Ton: locker, direkt, witzig aber nie gemein. KRITISCHE REGEL: Antworte AUSSCHLIESSLICH auf Deutsch. NIEMALS Chinesisch oder eine andere Sprache verwenden. Antworte NUR mit validem JSON, kein Markdown, keine Backticks.`;

  const jsonFull = isEN
    ? `{"score":<1.0-10.0>,"headline":"max 8 words funny","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-4 sentences specific feedback"}],"bio_versions":[{"label":"Funny & confident","text":"new bio"},{"label":"Direct & interesting","text":"new bio"},{"label":"Mysterious","text":"new bio"}]}`
    : `{"score":<1.0-10.0>,"headline":"max 8 Wörter witzig","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-4 Sätze konkretes Feedback"}],"bio_versions":[{"label":"Witzig & selbstbewusst","text":"neue Bio"},{"label":"Direkt & interessant","text":"neue Bio"},{"label":"Geheimnisvoll","text":"neue Bio"}]}`;

  const jsonMini = isEN
    ? `{"score":<1.0-10.0>,"headline":"max 8 words funny","roast_items":[{"emoji":"📸","category":"First Photo","severity":"high","text":"2-3 sentences"}]}`
    : `{"score":<1.0-10.0>,"headline":"max 8 Wörter witzig","roast_items":[{"emoji":"📸","category":"Erstes Foto","severity":"hoch","text":"2-3 Sätze"}]}`;

  const scoreTip = isEN
    ? `Score honestly: most profiles 3-7, weak 2-4, strong 7-8, exceptional 8-9. Give 8-12 items.`
    : `Score ehrlich: die meisten Profile 3-7, schwach 2-4, stark 7-8, ausnahmsweise 8-9. Gib 8-12 Items.`;

  const scoreTipMini = isEN
    ? `Score honestly: most profiles 3-7. Exactly 3 items.`
    : `Score ehrlich: die meisten Profile 3-7. Genau 3 Items.`;

  const platformHeader = isEN
    ? `PLATFORM: ${p}\nIMPORTANT platform-specific focus for ${p}:\n${platformTip}`
    : `PLATTFORM: ${p}\nWICHTIGER plattform-spezifischer Fokus für ${p}:\n${platformTip}`;

  const prompt = `${platformHeader}${bioText}${imageHint}

${isFull ? scoreTip : scoreTipMini}

${isEN ? `Respond ONLY with this JSON:\n${isFull ? jsonFull : jsonMini}\n\nEVERY word must be in English. No other language allowed.`
       : `Antworte NUR mit diesem JSON:\n${isFull ? jsonFull : jsonMini}\n\nJEDES Wort muss auf Deutsch sein. Keine andere Sprache erlaubt.`}`;

  try {
    let response, lastErr;
    for (const model of ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k']) {
      try {
        const userContent = (images && images.length > 0 && imageMimeTypes)
          ? [{ type: 'text', text: prompt }, ...images.slice(0,2).map((img,i) => ({
              type: 'image_url',
              image_url: { url: `data:${imageMimeTypes[i]||'image/jpeg'};base64,${img}` }
            }))]
          : prompt;

        response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}` },
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
        if (response.ok) break;
        lastErr = await response.text();
      } catch(e) { lastErr = e.message; }
    }

    if (!response || !response.ok) {
      return res.status(502).json({ error: isEN ? 'AI service unavailable.' : 'KI-Service nicht erreichbar.' });
    }

    const data = await response.json();
    let text = (data.choices?.[0]?.message?.content || '').replace(/```json/g,'').replace(/```/g,'').trim();

    // Reject Chinese characters
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/u.test(text)) {
      return res.status(502).json({ error: isEN ? 'Invalid response, please try again.' : 'Ungültige Antwort, bitte nochmal versuchen.' });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error('Roast error:', err);
    return res.status(500).json({ error: isEN ? 'Something went wrong.' : 'Fehler. Bitte nochmal versuchen.' });
  }
}
