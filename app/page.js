'use client';
import { useState, useEffect } from 'react';
import { GEN } from '../lib/db';
import { ground, audit } from '../lib/audit';
import { checkStrip, num } from '../lib/strip';

const shrink = (file, max = 1400, q = 0.85) => new Promise(res => {
  const img = new Image(), fr = new FileReader();
  fr.onload = () => { img.onload = () => {
    const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    res(c.toDataURL('image/jpeg', q)); }; img.src = fr.result; };
  fr.readAsDataURL(file);
});
const mk = (raw, alts = [], ex = {}) => ({ raw, strength: num(raw) ? String(num(raw)) : '', schedule: '', ...ex, ...ground(raw, alts) });
const SAMPLES = {
  kidney: [['কিডনি ক্লিনিক', '2026-09-01', ['Osartil 50']], ['মেডিসিন চেম্বার', '2026-10-15', ['Naprox 500', 'Napa 500']]],
  heart: [['হার্ট ক্লিনিক', '2026-10-01', ['Ecosprin 75', 'Clopid 75', 'Atova 20']], ['অর্থোপেডিক', '2026-11-05', ['Voltaren 50', 'Seclo 20']]],
  allergy: [['ঢাকা মেডিকেল', '2024-10-22', ['Montene 10', 'Fexo 180', 'Famotil 40']], ['ইএনটি ক্লিনিক', '2026-07-26', ['Monas 10', 'Cevit 250']]]
};
const T = { bn: { rx: 'প্রেসক্রিপশন', his: 'ইতিহাস', strip: 'স্ট্রিপ যাচাই', sch: 'সময়সূচি', med: 'ওষুধ', title: 'প্রেসক্রিপশন যাচাই করুন', sub: 'ছবি আপলোড করুন বা ক্যামেরায় তুলুন।', up: 'ছবি আপলোড', cam: 'ছবি তুলুন', drag: 'অথবা প্রেসক্রিপশনের ছবি এখানে ফেলুন', samp: 'নমুনা:', foot: 'ওষুধ বদলানোর আগে সবসময় ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।' },
  en: { rx: 'Prescription', his: 'History', strip: 'Check Strip', sch: 'Schedule', med: 'Medicines', title: 'Check a Prescription', sub: 'Upload a photo or take one with your camera.', up: 'Upload Photo', cam: 'Take Photo', drag: 'Or drag and drop a prescription photo here', samp: 'Try a sample:', foot: 'Always confirm medicine changes with your doctor or pharmacist.' } };

export default function Home() {
  const [lang, setLang] = useState('bn'); const t = T[lang];
  const [tab, setTab] = useState('rx');
  const [rxs, setRxs] = useState([]); const [strips, setStrips] = useState([]);
  const [pts, setPts] = useState([{ id: 'p1', name: 'রোগী ১' }]); const [pid, setPid] = useState('p1'); const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const l = JSON.parse(localStorage.getItem('og:patients') || 'null'); const cur = localStorage.getItem('og:cur') || 'p1';
    if (l) setPts(l); setPid(cur); setRxs(JSON.parse(localStorage.getItem('og:rx:' + cur) || '[]')); } catch (e) {} setLoaded(true); }, []);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem('og:patients', JSON.stringify(pts)); localStorage.setItem('og:cur', pid); localStorage.setItem('og:rx:' + pid, JSON.stringify(rxs)); } catch (e) {} }, [rxs, pts, pid, loaded]);
  const switchPt = id => { setPid(id); try { setRxs(JSON.parse(localStorage.getItem('og:rx:' + id) || '[]')); } catch (e) { setRxs([]); } setRes(null); setStrips([]); };
  const addPt = () => { const name = prompt('রোগীর নাম'); if (!name) return; const id = 'p' + Date.now(); setPts(p => [...p, { id, name }]); setPid(id); setRxs([]); setRes(null); setStrips([]); };
  const [merge, setMerge] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [res, setRes] = useState(null); const [drag, setDrag] = useState(false);
  const upd = (i, f) => setRxs(r => r.map((x, k) => k === i ? f(x) : x));
  const setItem = (i, k, f) => upd(i, r => ({ ...r, items: r.items.map((m, j) => j === k ? f(m) : m) }));

  async function post(url, file) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: file }) });
    return r.json();
  }
  async function readRx(files) {
    files = files.slice(0, 8); setErr(''); setBusy(true); setTab('rx');
    const mkRx = (j, img) => ({ clinic: j.doctor || '', date: j.date || '', diag: j.diagnosis || '', img, items: (j.medicines || []).map(m => mk(m.raw, m.alts || [], { strength: (m.strength || '').replace(/\D*(\d+\.?\d*).*/, '$1'), schedule: m.schedule || '', detail: m.form || '' })) });
    const call = async fs => { const fulls = await Promise.all(fs.map(f => shrink(f))); const thumb = await shrink(fs[0], 500, 0.6);
      const r = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: fulls }) });
      const j = await r.json(); if (j.error) throw new Error(j.error); return mkRx(j, thumb); };
    try {
      if (merge && files.length > 1) setRxs(p => [...p, ...[]]), await call(files).then(x => setRxs(p => [...p, x]));
      else await Promise.all(files.map(f => call([f]).then(x => setRxs(p => [...p, x])).catch(e => setErr(e.message))));
    } catch (x) { setErr(x.message); }
    setBusy(false); setRes(null);
  }
  async function readStrip(files) {
    setErr(''); setBusy(true);
    for (const f of files) try { const img = await shrink(f); setStrips(p => [...p, { img, data: null }]); const j = await post('/api/strip', img);
      setStrips(p => p.map(s => s.img === img ? { ...s, data: j.error ? { readable: false, reason: j.error } : j } : s)); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const pick = fn => e => { fn(Array.from(e.target.files)); e.target.value = ''; };
  const loadSample = k => { setRxs(SAMPLES[k].map(([clinic, date, l]) => ({ clinic, date, diag: '', img: null, items: l.map(n => mk(n, [], { schedule: '1+0+1' })) }))); setRes(null); setTab('rx'); };
  const speak = txt => { const u = new SpeechSynthesisUtterance(txt); u.lang = 'bn-BD'; speechSynthesis.cancel(); speechSynthesis.speak(u); };
  const Pick = ({ fn, cam, label, sec }) => <label className={'btn' + (sec ? ' s' : '')}>{label}<input type="file" accept="image/*" multiple={!cam} capture={cam ? 'environment' : undefined} hidden onChange={pick(fn)} /></label>;
  const mergeBox = <label className="sub" style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={merge} onChange={e => setMerge(e.target.checked)} /> সবগুলো ছবি একই প্রেসক্রিপশনের (একাধিক পাতা)</label>;
  const Hero = ({ title, fn, drop, extra }) => (
    <div className="hero"><h1>{title}</h1><p>{t.sub}</p>
      <div className={'box' + (drag ? ' drag' : '')} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); fn(Array.from(e.dataTransfer.files)); }}>
        <Pick fn={fn} label={'⬆ ' + t.up} /><Pick fn={fn} cam sec label={'📷 ' + t.cam} />
        <div className="hint">{drop}</div>{extra}</div>
      {busy && <p className="sub">AI পড়ছে...</p>}{err && <p className="warn">{err}</p>}</div>);

  const all = rxs.flatMap((r, i) => r.items.map((m, k) => ({ ...m, i, k, clinic: r.clinic })));
  const sun = s => { const m = String(s || '').match(/(\d)\s*\+\s*(\d)\s*\+\s*(\d)/); return m ? [m[1], m[2], m[3]] : null; };

  return (<>
    <nav><b>OshudhGuard</b>
      {['rx', 'his', 'strip', 'sch', 'med'].map(k => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{t[k]}</button>)}
      <div className="lang"><button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button><button className={lang === 'bn' ? 'on' : ''} onClick={() => setLang('bn')}>বাংলা</button></div></nav>
    <main>
      <div className="row"><span className="sub">রোগী:</span><select value={pid} onChange={e => switchPt(e.target.value)}>{pts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button className="s sm" onClick={addPt}>+ নতুন রোগী</button><span className="sub">(ডেটা এই ডিভাইসে সংরক্ষিত থাকে)</span></div>
      {tab === 'rx' && <>
        {!rxs.length ? <>
          <Hero title={t.title} fn={readRx} drop={t.drag} extra={mergeBox} />
          <div className="samples">{t.samp}{[['kidney', 'Kidney'], ['heart', 'Heart'], ['allergy', 'Allergy']].map(([k, l]) => <a key={k} onClick={() => loadSample(k)}>{l}</a>)}</div></> : <>
          {rxs.map((r, i) => (<div className="card" key={i}>
            <div className="row">{r.img && <img className="th" src={r.img} alt="" />}
              <input placeholder="ক্লিনিক / ডাক্তার" value={r.clinic} onChange={e => upd(i, x => ({ ...x, clinic: e.target.value }))} />
              <input type="date" value={r.date} onChange={e => upd(i, x => ({ ...x, date: e.target.value }))} />
              <button className="s sm" onClick={() => { setRxs(p => p.filter((_, k) => k !== i)); setRes(null); }}>✕</button></div>
            {r.diag && <div className="sub">রোগ: {r.diag}</div>}
            {r.items.map((m, k) => (<div className="it" key={k}><b>{m.raw}</b>
              {m.g ? <span className="ok">→ {GEN[m.g].bn} ✓</span> : <><span className="warn">অনিশ্চিত ({m.score})</span>
                <select defaultValue="" onChange={e => setItem(i, k, x => ({ ...x, g: e.target.value || null }))}><option value="">নিশ্চিত করুন...</option>{m.cands.map(g => <option key={g} value={g}>{GEN[g].bn}</option>)}</select></>}
              <button className="s sm" onClick={() => upd(i, x => ({ ...x, items: x.items.filter((_, j) => j !== k) }))}>✕</button></div>))}
            <div className="row"><input placeholder="ওষুধ যোগ করুন + Enter" onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value; upd(i, x => ({ ...x, items: [...x.items, ...v.split(/[,\n]+/).filter(s => s.trim()).map(s => mk(s.trim()))] })); e.target.value = ''; } }} /></div>
          </div>))}
          <div className="row">{mergeBox}</div>
          <div className="row"><Pick fn={readRx} label={'+ অন্য ক্লিনিকের প্রেসক্রিপশন যোগ করুন (রোগী/Caregiver)'} sec /><button onClick={() => setRes(audit(rxs))}>সব একসাথে যাচাই করুন</button></div>
          {busy && <p className="sub">AI পড়ছে...</p>}{err && <p className="warn">{err}</p>}
          {res && <div className="card"><h2>ফলাফল</h2><p className="sub">সম্ভাব্য সমস্যা। ডাক্তার বা ফার্মাসিস্টকে দিয়ে যাচাই করুন। নিজে থেকে কোনো ওষুধ বন্ধ করবেন না।</p>{res.map((a, i) => <div key={i} className={'al ' + a.lv}><b>{a.title}</b>{a.text}</div>)}
            <div className="row"><button className="s sm" onClick={() => speak(res.map(a => a.title + '। ' + a.text).join(' '))}>🔊 বাংলায় শুনুন</button></div></div>}</>}
      </>}

      {tab === 'his' && (rxs.length ? <div>{[...rxs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r, n) => (
        <div className="card" key={n}><b>{r.date || 'তারিখ নেই'}</b> · {r.clinic || 'ক্লিনিক নেই'}{r.diag ? <span className="sub"> · {r.diag}</span> : null}
          <div className="row">{r.img && <img className="th" src={r.img} alt="" />}<span>{r.items.map(m => m.raw + (m.g ? ' (' + GEN[m.g].bn + ')' : ' (অনিশ্চিত)')).join(', ')}</span></div></div>))}
        <p className="sub">এই সব প্রেসক্রিপশন একসাথে ধরে অডিট হয়। পরিবারের কেউ (Caregiver) অন্য ক্লিনিকের প্রেসক্রিপশন যোগ করতে পারবেন।</p></div>
        : <div className="card"><p>এই রোগীর কোনো প্রেসক্রিপশনের ইতিহাস নেই।</p></div>)}

      {tab === 'strip' && <>
        {!rxs.length ? <div className="card"><p>আগে "প্রেসক্রিপশন" ট্যাবে প্রেসক্রিপশন যোগ করুন, তারপর স্ট্রিপের ছবি তুলুন।</p></div> : <>
          <Hero title="ওষুধের স্ট্রিপ যাচাই" fn={readStrip} drop="ফার্মেসি থেকে পাওয়া পাতার ছাপওয়ালা দিকের ছবি দিন" />
          {strips.map((s, i) => { const r = s.data ? checkStrip(s.data, rxs) : null; return (
            <div className="card" key={i}><div className="row"><img className="th" src={s.img} alt="" /><div style={{ flex: 1 }}>
              {!r ? <span className="sub">পড়ছে...</span> : <div className={'al ' + r.st}><b>{r.title}</b>{r.text}</div>}</div>
              <button className="s sm" onClick={() => setStrips(p => p.filter((_, k) => k !== i))}>✕</button></div>
              {r && <button className="s sm" onClick={() => speak(r.title + '। ' + r.text)}>🔊</button>}</div>); })}</>}
      </>}

      {tab === 'sch' && (all.length ? <div>{all.map((m, n) => { const s = sun(m.schedule); return (
        <div className="card" key={n}><b>{m.raw}</b> <span className="sub">{m.g ? GEN[m.g].bn : 'অনিশ্চিত'} · {m.clinic}</span>
          <div className="sun" style={{ margin: '8px 0' }}>{['☀️ সকাল', '🌤 দুপুর', '🌙 রাত'].map((l, x) => <div key={x} className={s && s[x] !== '0' ? 'on' : ''}>{l}<br />{s ? (s[x] !== '0' ? s[x] + 'টি' : '—') : '?'}</div>)}</div>
          <input placeholder="সময়সূচি, যেমন 1+0+1" value={m.schedule} onChange={e => setItem(m.i, m.k, x => ({ ...x, schedule: e.target.value }))} />
          {s && <button className="s sm" style={{ marginLeft: 8 }} onClick={() => speak(`${m.g ? GEN[m.g].bn : m.raw}: সকালে ${s[0]}টি, দুপুরে ${s[1]}টি, রাতে ${s[2]}টি।`)}>🔊</button>}</div>); })}</div>
        : <div className="card"><p>এখনো কোনো প্রেসক্রিপশন নেই।</p></div>)}

      {tab === 'med' && <div className="card">{all.length ? <table><thead><tr><th>নাম</th><th>জেনেরিক</th><th>মাত্রা</th><th>ক্লিনিক</th></tr></thead><tbody>
        {all.map((m, n) => <tr key={n}><td>{m.raw}</td><td>{m.g ? GEN[m.g].bn : <span className="warn">অনিশ্চিত</span>}</td><td>{m.strength ? m.strength + ' mg' : '—'}</td><td>{m.clinic}</td></tr>)}</tbody></table> : <p>এখনো কোনো ওষুধ নেই।</p>}</div>}
    </main>
    <footer><span>OshudhGuard</span><span>{t.foot}</span></footer>
  </>);
}
