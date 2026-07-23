// Serverless (Vercel) — AI try-on. The Fal key lives ONLY here, never in the browser.
// Takes the person photo (data URI) + the chosen hat, calls fal-ai/nano-banana-2/edit
// and returns the generated image URL.

const HAT_FILES = {
  'felt-rust': 'hat-felt-rust.jpg',
  'leather-distressed': 'hat-leather-distressed.jpg',
  'leather-saddle': 'hat-leather-saddle.jpg',
  'straw-black': 'hat-straw-black.jpg',
};

const ASPECTS = new Set(['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16']);

const PROMPT = 'Put this hat on this person. It is EXTREMELY IMPORTANT that you DO NOT CHANGE THE PERSON OR THE HAT MODEL..... THE DETAILS OF THE HAT ARE EXTREMELY IMPORTANT.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) { res.status(503).json({ error: 'unconfigured' }); return; }

  // Light anti-abuse gate: require the request to come from our own site.
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = req.headers.origin || req.headers.referer || '';
  if (host && origin && !origin.includes(host)) { res.status(403).json({ error: 'forbidden' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') { res.status(400).json({ error: 'bad_body' }); return; }

  const { personImage, hat, hatImageUrl, aspect } = body;
  if (typeof personImage !== 'string' || !personImage.startsWith('data:image/')) { res.status(400).json({ error: 'bad_image' }); return; }
  if (personImage.length > 8_000_000) { res.status(413).json({ error: 'image_too_large' }); return; }

  // The hat can arrive by key (featured, served from this site)
  // or by supplier URL (catalog) — restricted to the Bullhide domain.
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  let hatUrl = null;
  if (HAT_FILES[hat]) {
    hatUrl = `${proto}://${host}/assets/${HAT_FILES[hat]}`;
  } else if (typeof hatImageUrl === 'string') {
    try {
      const u = new URL(hatImageUrl);
      if (u.protocol === 'https:' && (u.hostname === 'bullhidehats.com' || u.hostname.endsWith('.bullhidehats.com'))) {
        hatUrl = u.href;
      }
    } catch { /* invalid url */ }
  }
  if (!hatUrl) { res.status(400).json({ error: 'bad_hat' }); return; }

  const aspect_ratio = ASPECTS.has(aspect) ? aspect : 'auto';

  try {
    const r = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: PROMPT,
        image_urls: [personImage, hatUrl],
        resolution: '1K',
        aspect_ratio,
        num_images: 1,
        output_format: 'jpeg',
      }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) { res.status(502).json({ error: 'fal_error', status: r.status }); return; }
    const url = data && data.images && data.images[0] && data.images[0].url;
    if (!url) { res.status(502).json({ error: 'no_image' }); return; }
    res.status(200).json({ url });
  } catch (e) {
    res.status(502).json({ error: 'fetch_failed' });
  }
};
