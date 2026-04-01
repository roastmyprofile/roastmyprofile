// api/create-checkout.js
// Stripe Checkout Session mit Name + E-Mail

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, name, email } = req.body;
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://roastmyprofile.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: '🔥 Vollständiger Roast',
              description: `Komplette KI-Analyse deines ${platform || 'Dating'}-Profils – 10+ Kritikpunkte, 3 optimierte Bios, Match-Potenzial`,
            },
            unit_amount: 499, // 4,99€ in Cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${domain}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/?canceled=true`,
      metadata: {
        platform: platform || 'Tinder',
        customer_name: name || '',
        customer_email: email || ''
      },
      locale: 'de',
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Zahlung konnte nicht gestartet werden.' });
  }
}
