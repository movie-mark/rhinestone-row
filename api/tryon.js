// Serverless (Vercel) — probador con IA. La clave de Fal vive SOLO aquí, nunca en el navegador.
// Recibe la foto de la persona (data URI) + el sombrero elegido, llama a fal-ai/nano-banana-2/edit
// y devuelve la URL de la imagen generada.

const HAT_FILES = {
  'felt-rust': 'hat-felt-rust.jpg',
  'leather-distressed': 'hat-leather-distressed.jpg',
  'leather-saddle': 'hat-leather-saddle.jpg',
  'straw-black': 'hat-straw-black.jpg',
};

const ASPECTS = new Set(['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16']);

const PROMPT = 'Pon este sombrero en esta persona. Es EXTREMADAMENTE IMPORTANTE que NO CAMBIES NI LA PERSONA NI EL MODELO DEL SOMBRERO..... LOS DETALLES DEL SOMBRERO SON IMPORTANTISIMOS.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) { res.status(503).json({ error: 'unconfigured' }); return; }

  // Barrera ligera contra abuso: exigir que la petición venga del propio sitio.
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = req.headers.origin || req.headers.referer || '';
  if (host && origin && !origin.includes(host)) { res.status(403).json({ error: 'forbidden' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') { res.status(400).json({ error: 'bad_body' }); return; }

  const { personImage, hat, aspect } = body;
  if (typeof personImage !== 'string' || !personImage.startsWith('data:image/')) { res.status(400).json({ error: 'bad_image' }); return; }
  if (personImage.length > 8_000_000) { res.status(413).json({ error: 'image_too_large' }); return; }
  const hatFile = HAT_FILES[hat];
  if (!hatFile) { res.status(400).json({ error: 'bad_hat' }); return; }

  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const hatUrl = `${proto}://${host}/assets/${hatFile}`;
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
