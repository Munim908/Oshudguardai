export const runtime = 'nodejs';
export const maxDuration = 30;
const PROMPT = `You inspect a photo of a medicine blister strip (metal foil, may be cut, torn, glared or cropped). Return ONLY JSON:
{"readable":boolean,"legibility":0-1,"brand":"brand name printed on foil or empty","generic":"generic name printed or empty","strength":"e.g. 20mg or empty","reason":"short Bangla reason if unreadable"}
CRITICAL: if the printed imprint is damaged, cropped, blurred or glared so you cannot read it with confidence, set readable=false and legibility<0.5. NEVER guess a name.`;
export async function POST(req) {
  try {
    const { image } = await req.json();
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: 'GEMINI_API_KEY সেট করা নেই' }, { status: 500 });
    const [meta, data] = image.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 } })
    });
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return Response.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (e) { return Response.json({ readable: false, legibility: 0, reason: 'ছবি বিশ্লেষণ করা যায়নি' }); }
}
