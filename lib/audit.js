import { GEN, BRANDS, CLS, RULES } from './db';
export const TAU = 0.78; // আইডিয়া ডকুমেন্টের safety threshold
const GAP_DAYS = 60;     // এর বেশি ফাঁক হলে "পুরোনো প্রেসক্রিপশন" ধরা হয়

function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for (let j=1;j<=n;j++) d[0][j]=j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
export const clean = s => String(s||'').toLowerCase().replace(/[0-9.]+\s*(mg|ml|mcg|gm|g)?/g,' ')
  .replace(/\b(tab|tb|tablet|cap|capsule|syp|syrup|inj|spray|nasal)\b\.?/g,' ').replace(/[^a-z\s]/g,' ').trim().split(/\s+/)[0]||'';

// raw নাম (এবং VLM-এর বিকল্প নাম) -> {g, score, cands}
export function ground(raw, alts=[]) {
  const qs = [raw, ...alts].map(clean).filter(Boolean);
  const scored = {};
  for (const q of qs) for (const [b,g] of Object.entries(BRANDS)) {
    const s = 1 - lev(q,b)/Math.max(q.length,b.length);
    if (!scored[g] || s > scored[g].score) scored[g] = {g, brand:b, score:s};
  }
  const list = Object.values(scored).sort((x,y)=>y.score-x.score);
  const top = list[0];
  return { g: top && top.score >= TAU ? top.g : null, score: top ? +top.score.toFixed(2) : 0, cands: list.slice(0,2).map(x=>x.g) };
}
const tags = g => [g, GEN[g].cls].filter(Boolean);
const days = (a,b) => (a&&b) ? Math.abs((new Date(a)-new Date(b))/864e5) : null;

export function audit(rxs) {
  const all = [];
  rxs.forEach((r,i)=>r.items.forEach(m=>{ if(m.g) all.push({...m,i,date:r.date,clinic:r.clinic||`প্রেসক্রিপশন ${i+1}`}); }));
  const out = [];
  const by = {};
  all.forEach(m=>(by[m.g]=by[m.g]||[]).push(m));
  for (const g in by) {
    const a = by[g]; if (a.length < 2) continue;
    const sameRx = a.some((x,k)=>a.some((y,l)=>k<l && x.i===y.i));
    let gap = 0; a.forEach(x=>a.forEach(y=>{const d=days(x.date,y.date); if(d!==null&&d>gap) gap=d;}));
    const old = !sameRx && gap > GAP_DAYS;
    out.push({
      lv: old ? 'a' : 'r',
      title: `একই জেনেরিক ওষুধ: ${GEN[g].bn}`,
      text: `${a.map(x=>`${x.raw} (${x.clinic}${x.date?', '+x.date:''})`).join(' এবং ')}। নাম আলাদা হলেও উপাদান একই।` +
        (old ? ` দুই প্রেসক্রিপশনের মধ্যে প্রায় ${Math.round(gap/30)} মাসের ফাঁক। পুরোনোটা এখনো চলছে কি না নিশ্চিত হোন। দুটো একসাথে চললে ওভারডোজের ঝুঁকি।` : ' দুবার খেলে ওভারডোজ হতে পারে।')
    });
  }
  const uniq = [...new Set(all.map(m=>m.g))];
  const cs = {}; uniq.forEach(g=>{const c=GEN[g].cls; if(c&&CLS[c]) (cs[c]=cs[c]||[]).push(g);});
  for (const c in cs) if (cs[c].length>1)
    out.push({lv:'a', title:`একই শ্রেণির একাধিক ওষুধ: ${CLS[c]}`, text:cs[c].map(g=>GEN[g].bn).join(' + ')+'। একই ধরনের ওষুধ একসাথে দেওয়া হয়েছে কি না যাচাই করুন।'});
  const done = new Set();
  for (let x=0;x<all.length;x++) for (let y=x+1;y<all.length;y++) {
    const A=all[x],B=all[y]; if (A.g===B.g) continue;
    const key=[A.g,B.g].sort().join('|'); if (done.has(key)) continue;
    for (const [p,q,lv,txt] of RULES) {
      if ((tags(A.g).includes(p)&&tags(B.g).includes(q))||(tags(A.g).includes(q)&&tags(B.g).includes(p))) {
        done.add(key);
        const g2 = days(A.date,B.date), old = A.i!==B.i && g2!==null && g2>GAP_DAYS;
        out.push({lv: old?'a':lv, title:`${lv==='r'&&!old?'গুরুতর ':''}interaction: ${GEN[A.g].bn} + ${GEN[B.g].bn}${A.i!==B.i?` (${A.clinic} ও ${B.clinic})`:''}`,
          text: txt + (old?' তবে প্রেসক্রিপশন দুটোর মধ্যে অনেক ফাঁক, দুটোই এখন চলছে কি না দেখুন।':'')});
        break;
      }
    }
  }
  const unk = rxs.flatMap(r=>r.items.filter(m=>!m.g));
  if (unk.length) out.push({lv:'a', title:'চেনা যায়নি (যাচাই করা হয়নি)', text:unk.map(u=>u.raw).join(', ')+'। এগুলো অনুমান করা হয়নি। ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।'});
  if (!out.length) out.push({lv:'g', title:'কোনো duplicate বা পরিচিত interaction পাওয়া যায়নি', text:'ছোট ডেটাবেসে কিছু মেলেনি। তবু ডাক্তারের পরামর্শ নিন।'});
  return out;
}
