// functions/api/see-yourself.js
//
// Cloudflare Pages Function — POST /api/see-yourself
//
// Takes a shopper's selfie + a vehicle photo and asks an AI image model to
// composite a realistic photo of that person driving the car (shot from
// outside, as if someone stood on the curb and took the picture).
//
// COST CONTROL: this endpoint enforces a hard monthly generation cap so the
// bill can never exceed the budget set below, no matter how much traffic it
// gets. Once the cap is hit, it returns 429 and the frontend falls back to
// the free, canvas-only version automatically.
//
// ---- One-time setup (do this in the Cloudflare Pages dashboard) ----
// 1. Get a Gemini API key: https://aistudio.google.com/apikey
// 2. Pages project → Settings → Environment variables → add a SECRET named
//    GEMINI_API_KEY with that key. Do this for both Production and Preview.
// 3. Pages project → Settings → Functions → KV namespace bindings → create
//    a KV namespace (e.g. "see-yourself-budget") and bind it to the
//    variable name SY_BUDGET. (Workers & Pages → KV → Create namespace,
//    then bind it here.)
// 4. Redeploy. That's it — no other code changes needed.
//
// If GEMINI_API_KEY or SY_BUDGET aren't configured yet, this endpoint
// returns a clear 501 so the frontend can fall back gracefully instead of
// throwing a confusing error.

// ---- Budget knobs ----
// Gemini's image-generation model (gemini-2.5-flash-image, aka "nano
// banana") runs roughly $0.02-$0.04 per generated image as of writing.
// MONTHLY_CAP is set conservatively so that even at the higher end of that
// range, worst case stays under the target budget. Tune MONTHLY_BUDGET_USD
// and EST_COST_PER_IMAGE if pricing changes, and MONTHLY_CAP recalculates
// itself — but it's also hard-clamped to MONTHLY_CAP_CEILING as a safety
// net in case the estimate is ever wrong.
const MONTHLY_BUDGET_USD = 5;
const EST_COST_PER_IMAGE = 0.035; // conservative (actual is usually lower)
const MONTHLY_CAP_CEILING = 160; // absolute hard stop, regardless of math above
const MONTHLY_CAP = Math.min(MONTHLY_CAP_CEILING, Math.floor(MONTHLY_BUDGET_USD / EST_COST_PER_IMAGE));

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function monthKey() {
  const d = new Date();
  return `sy-budget-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}

// Strips a "data:image/xxx;base64," prefix if present and returns
// { mimeType, data } for the Gemini inlineData field.
function parseDataUrl(dataUrl, fallbackMime) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: fallbackMime || 'image/jpeg', data: dataUrl };
}

export async function onRequestPost(context) {
  // Paid image generation is not enabled for this free preview feature.
  return json({error:'not_configured',message:'Use the free instant preview.'},501);
}

// Retained for review only; not exported or reachable by a Pages route.
async function paidPreviewDisabled(context) {
  const { request, env } = context;

  if (!env.GEMINI_API_KEY || !env.SY_BUDGET) {
    return json(
      {
        error: 'not_configured',
        message:
          'The AI-enhanced version isn\'t set up on this deployment yet (missing GEMINI_API_KEY secret or SY_BUDGET KV binding). See the comment at the top of functions/api/see-yourself.js.',
      },
      501,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad_request', message: 'Expected JSON body.' }, 400);
  }

  const { selfie, carPhoto, vehicleTitle } = payload || {};
  if (!selfie || !carPhoto) {
    return json({ error: 'bad_request', message: 'selfie and carPhoto (data URLs) are required.' }, 400);
  }

  // ---- budget check (KV-backed monthly counter) ----
  const key = monthKey();
  const current = Number((await env.SY_BUDGET.get(key)) || '0');
  if (current >= MONTHLY_CAP) {
    return json(
      {
        error: 'budget_exceeded',
        message: "We've hit this month's limit for AI-enhanced previews — try the free instant version instead.",
        cap: MONTHLY_CAP,
      },
      429,
    );
  }

  // ---- build the Gemini request ----
  const selfiePart = parseDataUrl(selfie, 'image/jpeg');
  const carPart = parseDataUrl(carPhoto, 'image/jpeg');

  const prompt =
    'You are given two photos: the FIRST is a selfie of a person, the SECOND is a photo of a car' +
    (vehicleTitle ? ` (${vehicleTitle})` : '') +
    '. Create one new, photorealistic image showing that exact person sitting in the driver\'s seat of that ' +
    'exact car, photographed from outside the vehicle at a natural three-quarter angle, as if someone were ' +
    'standing on the curb taking a picture of the car with its driver visible through the window. Match the ' +
    'car\'s real color, body style and background/lighting from the second photo as closely as possible. Keep ' +
    'the person\'s face, skin tone and hair clearly recognizable from the selfie. Do not add text, watermarks or ' +
    'logos. Output only the final composited photo.';

  const geminiBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: selfiePart.mimeType, data: selfiePart.data } },
          { inlineData: { mimeType: carPart.mimeType, data: carPart.data } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  let geminiRes;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });
  } catch (err) {
    return json({ error: 'upstream_unreachable', message: String(err && err.message ? err.message : err) }, 502);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => '');
    return json(
      { error: 'upstream_error', status: geminiRes.status, message: errText.slice(0, 500) },
      502,
    );
  }

  const geminiJson = await geminiRes.json().catch(() => null);
  const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);

  if (!imagePart) {
    return json({ error: 'no_image_returned', message: 'The model did not return an image for this request.' }, 502);
  }

  // Only count successful, billable generations against the budget.
  await env.SY_BUDGET.put(key, String(current + 1), { expirationTtl: 60 * 60 * 24 * 45 });

  return json({
    image: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
    remaining: Math.max(0, MONTHLY_CAP - (current + 1)),
    cap: MONTHLY_CAP,
  });
}

export async function onRequestGet() {
  return json({ ok: true, cap: MONTHLY_CAP, note: 'POST a selfie + carPhoto (data URLs) to generate.' });
}
