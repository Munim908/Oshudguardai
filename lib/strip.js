import { ground, clean } from './audit';
import { GEN } from './db';
export const num = s => { const m = String(s || '').match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };

// Task 2: অস্পষ্ট ছবি = 'যাচাই করা যায়নি' (লাল alert), কিন্তু 'ভুল ওষুধ' নয়।
export function checkStrip(s, rxs) {
  if (!s) return null;
  if (!s.readable || (s.legibility ?? 0) < 0.5)
    return { st: 'hold', title: '🔴 যাচাই করা যায়নি, যাচাই না হওয়া পর্যন্ত ব্যবহার করবেন না', text: 'স্ট্রিপের ছাপ পড়া যাচ্ছে না (ছেঁড়া, কাটা বা আলোর প্রতিফলন)। এটা ভুল ওষুধ বলে নিশ্চিত করা হচ্ছে না, শুধু যাচাই করা যায়নি। ' + (s.reason ? s.reason + '। ' : '') + 'আবার ছবি তুলুন বা ফার্মাসিস্টকে দেখান।' };
  const gr = ground(s.brand || s.generic || '', [s.generic || '']);
  if (!gr.g) return { st: 'hold', title: '🔴 যাচাই করা যায়নি, যাচাই না হওয়া পর্যন্ত ব্যবহার করবেন না', text: `স্ট্রিপে "${s.brand || s.generic || '?'}" পড়া গেছে, কিন্তু নিশ্চিতভাবে মেলেনি। ভুল ওষুধ বলা হচ্ছে না, তবে যাচাই না হওয়া পর্যন্ত খাবেন না। ফার্মাসিস্টকে জিজ্ঞেস করুন।` };
  const items = rxs.flatMap(r => r.items.filter(m => m.g));
  const same = items.filter(m => m.g === gr.g);
  const name = GEN[gr.g].bn;
  if (!same.length) return { st: 'red', title: `⛔ মিসম্যাচ: ${name}`, text: `স্ট্রিপের ওষুধ (${s.brand || name}) কোনো প্রেসক্রিপশনে নেই। ওষুধ না নিয়ে ফার্মাসিস্ট বা ডাক্তারকে দেখান।` };
  const sv = num(s.strength);
  const pv = same.map(m => num(m.strength ?? m.raw)).filter(v => v !== null);
  if (sv !== null && pv.length && !pv.includes(sv))
    return { st: 'red', title: `⛔ মাত্রা মেলেনি: ${name}`, text: `প্রেসক্রিপশনে ${pv.join('/')} মি.গ্রা., কিন্তু স্ট্রিপে ${sv} মি.গ্রা.। ওষুধ নেওয়ার আগে ফার্মাসিস্টকে দেখান।` };
  const sb = clean(s.brand || '');
  if (sb && !same.some(m => clean(m.raw) === sb))
    return { st: 'amber', title: `বিকল্প ব্র্যান্ড: ${name}`, text: `উপাদান একই (${name}), ব্র্যান্ড আলাদা (${s.brand})। সাধারণত সমস্যা নেই, তবে ফার্মাসিস্টকে নিশ্চিত করুন।` };
  return { st: 'green', title: `✓ মিলেছে: ${name}`, text: 'স্ট্রিপ প্রেসক্রিপশনের সাথে মিলেছে।' };
}
