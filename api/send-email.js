// api/send-email.js
// Schickt den vollen Roast per E-Mail – powered by Resend

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, platform, roastData } = req.body;

  if (!email || !roastData) {
    return res.status(400).json({ error: 'E-Mail oder Roast-Daten fehlen.' });
  }

  // Roast-Items als HTML formatieren
  const sevLabel = { 'hoch': '🔴 KRITISCH', 'mittel': '🟡 WICHTIG', 'niedrig': '🟢 OK' };
  const roastItemsHtml = (roastData.roast_items || []).map(item => `
    <div style="background:#1C1209;border:1px solid rgba(255,69,0,0.2);padding:16px 20px;margin-bottom:12px;border-radius:4px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:18px;">${item.emoji || '🔥'}</span>
        <strong style="color:#FF4500;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${item.category || ''}</strong>
        <span style="margin-left:auto;font-size:11px;color:#7A6A5A;">${sevLabel[item.severity] || ''}</span>
      </div>
      <p style="color:#e8e0d8;font-size:14px;line-height:1.6;margin:0;">${item.text || ''}</p>
    </div>
  `).join('');

  // Bio-Versionen als HTML
  const bioVersionsHtml = (roastData.bio_versions || []).map((v, i) => `
    <div style="background:#1C1209;border:1px solid rgba(255,255,255,0.08);padding:16px 20px;margin-bottom:10px;border-radius:4px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7A6A5A;margin-bottom:8px;">Version ${i + 1} – ${v.label || ''}</div>
      <p style="color:#FFF8F0;font-size:14px;line-height:1.6;font-style:italic;margin:0;">"${v.text || ''}"</p>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0D0905;font-family:'DM Sans',Arial,sans-serif;color:#FFF8F0;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:3px;font-weight:900;">
        ROAST<span style="color:#FF4500;">MY</span>PROFILE
      </div>
      <div style="font-size:12px;color:#7A6A5A;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Dein Ergebnis ist da 🔥</div>
    </div>

    <!-- Greeting -->
    <div style="background:#1C1209;border:1px solid rgba(255,69,0,0.3);padding:24px;margin-bottom:24px;border-radius:4px;">
      <p style="font-size:16px;line-height:1.6;margin:0;">
        Hey <strong style="color:#FF4500;">${name || 'du'}</strong> 👋<br><br>
        Hier ist dein vollständiger <strong>${platform || 'Dating'}</strong>-Profil Roast. Wir haben nichts beschönigt – das ist die ehrliche KI-Analyse die dir mehr Matches bringt.
      </p>
    </div>

    <!-- Score -->
    <div style="text-align:center;background:#1C1209;border:1px solid rgba(255,69,0,0.2);padding:32px;margin-bottom:24px;border-radius:4px;">
      <div style="font-size:72px;font-weight:900;color:#FF4500;line-height:1;">${roastData.score || '?'}</div>
      <div style="font-size:24px;color:#7A6A5A;">/10</div>
      <div style="font-size:12px;color:#7A6A5A;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Dein Match-Score</div>
      ${roastData.headline ? `<div style="font-size:16px;color:#FFF8F0;margin-top:12px;font-style:italic;">"${roastData.headline}"</div>` : ''}
    </div>

    <!-- Roast Items -->
    <div style="margin-bottom:28px;">
      <h2 style="font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#7A6A5A;margin-bottom:16px;">🔥 Deine vollständige Analyse</h2>
      ${roastItemsHtml}
    </div>

    <!-- Bio Versions -->
    ${roastData.bio_versions?.length ? `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#7A6A5A;margin-bottom:16px;">✏️ Deine optimierten Bios</h2>
      ${bioVersionsHtml}
      <p style="font-size:13px;color:#7A6A5A;margin-top:8px;">💡 Kopiere einfach eine der Versionen und füge sie in dein ${platform}-Profil ein.</p>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://roastmyprofile.app" style="display:inline-block;background:#FF4500;color:#FFF8F0;text-decoration:none;padding:16px 40px;font-weight:700;font-size:15px;letter-spacing:0.5px;">
        Zurück zur App 🔥
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;text-align:center;">
      <p style="font-size:12px;color:#7A6A5A;line-height:1.6;">
        Du hast diesen Roast auf <a href="https://roastmyprofile.app" style="color:#FF4500;">roastmyprofile.app</a> angefordert.<br>
        Einmalzahlung · Kein Abo · Keine weiteren E-Mails
      </p>
    </div>

  </div>
</body>
</html>`;

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
        subject: `🔥 Dein ${platform}-Profil Roast – Score: ${roastData.score}/10`,
        html
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: 'E-Mail Fehler.' });
  }
}
