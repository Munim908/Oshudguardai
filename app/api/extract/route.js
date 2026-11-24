export const runtime = 'nodejs';
export const maxDuration = 30;
const PROMPT = `You read a handwritten Bangladeshi medical prescription photo (it may be rotated). Return ONLY JSON:
{"doctor":string,"date":"YYYY-MM-DD or empty","diagnosis":string,
"medicines":[{"raw":"best reading of the brand name as written","alts":["2 other plausible readings"],"form":"Tab|Cap|Syp|Spray|Inj|","strength":"e.g. 10mg or empty","schedule":"e.g. 1+0+1 or empty"}]}
If several images are given they are pages of the SAME prescription: merge all medicines into one list.
Rules: list every medicine line. NEVER invent a name you cannot read: put your best letters in "raw". Do not include tests/advice.`;
export async function POST(req) {
  try {
    const { image, images } = await req.json();
    const list = images || [image];
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: 'GEMINI_API_KEY সেট করা নেই' }, { status: 500 });
    const imgs = list.map(s => { const [meta, data] = s.split(','); return { inlineData: { mimeType: meta.match(/data:(.*?);/)?.[1] || 'image/jpeg', data } }; });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, ...imgs] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 } })
    });
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return Response.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (e) { return Response.json({ error: 'ছবি পড়া যায়নি, আবার চেষ্টা করুন বা হাতে লিখুন' }, { status: 500 }); }
}
