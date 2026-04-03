// api/send-email.js
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, platform, roastData, isFree } = req.body;

  if (!email || !roastData) {
    return res.status(400).json({ error: 'E-Mail oder Roast-Daten fehlen.' });
  }

  const sevLabel = { 'hoch': '🔴 KRITISCH', 'high': '🔴 CRITICAL', 'mittel': '🟡 WICHTIG', 'medium': '🟡 IMPORTANT', 'niedrig': '🟢 OK', 'low': '🟢 OK' };

  const roastItemsHtml = (roastData.roast_items || []).map(item => `
    <div style="background:#1C1209;border:1px solid rgba(255,69,0,0.2);padding:16px 20px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:16px;">${item.emoji || '🔥'} <strong style="color:#FFF8F0;font-size:13px;letter-spacing:1px;text-transform:uppercase;">${item.category || ''}</strong></span>
        <span style="font-size:11px;font-weight:700;color:#FF4500;">${sevLabel[item.severity] || ''}</span>
      </div>
      <p style="color:rgba(255,248,240,0.75);font-size:14px;line-height:1.65;margin:0;">${item.text || ''}</p>
    </div>
  `).join('');

  const bioVersionsHtml = !isFree && (roastData.bio_versions || []).length > 0
    ? `<div style="margin-top:32px;">
        <h2 style="font-family:Georgia,serif;font-size:22px;color:#FF4500;margin-bottom:16px;">✏️ Deine optimierten Bios</h2>
        ${(roastData.bio_versions || []).map((v, i) => `
          <div style="background:#1C1209;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;margin-bottom:12px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7A6A5A;margin-bottom:8px;">Version ${i+1} – ${v.label || ''}</div>
            <p style="color:#FFF8F0;font-size:14px;line-height:1.6;margin:0;font-style:italic;">${v.text || ''}</p>
          </div>
        `).join('')}
      </div>`
    : '';

  const greeting = name ? `Hey ${name}` : 'Hey';
  const isFreeLabel = isFree ? ' (Mini-Roast)' : '';
  const upgradeHint = isFree
    ? `<div style="background:linear-gradient(135deg,rgba(255,69,0,0.15),rgba(255,184,0,0.08));border:1px solid rgba(255,69,0,0.3);padding:20px 24px;margin-top:28px;text-align:center;">
        <p style="color:#FFF8F0;font-size:15px;font-weight:700;margin:0 0 8px;">🔒 Das war erst der Anfang</p>
        <p style="color:rgba(255,248,240,0.6);font-size:13px;margin:0 0 16px;">Der volle Roast zeigt dir 10+ Probleme + 3 fertige Bios die du direkt kopieren kannst.</p>
        <a href="https://roastmyprofile.app" style="display:inline-block;background:#FF4500;color:#FFF8F0;text-decoration:none;padding:12px 32px;font-weight:700;font-size:14px;">🔥 Vollen Roast freischalten – 4,99 €</a>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0D0905;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-family:Georgia,serif;font-size:28px;letter-spacing:3px;color:#FFF8F0;margin:0;">ROAST<span style="color:#FF4500;">MY</span>PROFILE</h1>
    </div>
    <div style="background:#160F09;border:1px solid rgba(255,69,0,0.2);padding:28px;">
      <p style="color:rgba(255,248,240,0.55);font-size:13px;margin:0 0 4px;">🔥 ${platform || 'Dating'}-Profil Analyse${isFreeLabel}</p>
      <h2 style="font-family:Georgia,serif;font-size:24px;color:#FFF8F0;margin:0 0 6px;">${greeting}, hier ist dein Roast.</h2>
      <p style="color:rgba(255,248,240,0.55);font-size:14px;margin:0 0 24px;">Ehrliches Feedback – wie ein Freund der nichts beschönigt.</p>
      <div style="display:flex;align-items:center;gap:16px;background:#1C1209;border:1px solid rgba(255,69,0,0.2);padding:16px 20px;margin-bottom:24px;">
        <div style="font-family:Georgia,serif;font-size:56px;color:#FF4500;line-height:1;">${roastData.score || '?'}</div>
        <div>
          <div style="font-size:11px;color:#7A6A5A;text-transform:uppercase;letter-spacing:1px;">Match-Score</div>
          <div style="font-size:15px;font-weight:700;color:#FFF8F0;margin-top:4px;">${roastData.headline || ''}</div>
        </div>
      </div>
      ${roastItemsHtml}
      ${bioVersionsHtml}
      ${upgradeHint}
    </div>
    <div style="text-align:center;padding:24px 0;border-top:1px solid rgba(255,255,255,0.07);margin-top:24px;">
      <a href="https://roastmyprofile.app" style="color:#FF4500;font-size:13px;text-decoration:none;">roastmyprofile.app</a>
      <p style="color:#7A6A5A;font-size:11px;margin:8px 0 0;">© 2025 RoastMyProfile · Dennis Reinhardt · Altenberger Str. 81, 01277 Dresden</p>
    </div>
  </div>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'RoastMyProfile <roast@roastmyprofile.app>',
        to: [email],
        subject: isFree
          ? `🔥 ${greeting}, dein Mini-Roast ist fertig – Score: ${roastData.score}/10`
          : `🔥 ${greeting}, dein voller Roast ist fertig – Score: ${roastData.score}/10`,
        html
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' });
  }
}
