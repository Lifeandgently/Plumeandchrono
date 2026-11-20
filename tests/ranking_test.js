// Weekly ranking per practice language (FR / EN / ES). Run from the repository root: node tests/ranking_test.js
// Needs Playwright with Chromium. Prints PASS / FAIL per check, then DONE.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const src = path.resolve(process.argv[2] || path.join(__dirname, '..'));
// app.js keeps its services private (no globals). Test a temporary copy that exposes them on window; the real files are never changed.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-rank-'));
for (const f of ['index.html', 'style.css', 'exercises.js', 'audio.js', 'app.js']) fs.copyFileSync(path.join(src, f), path.join(dir, f));
const appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf8'), tail = 'applyLang();\n})();';
if (!appSrc.trimEnd().endsWith(tail)) throw new Error('app.js ending changed: update the test hook');
fs.writeFileSync(path.join(dir, 'app.js'), appSrc.trimEnd().slice(0, -tail.length) + 'window.Board = Board; window.LB = LB; window.LBView = LBView; window.rowLang = rowLang; window.PRACTICE = PRACTICE;\n' + tail);
// Serve the copy over http://127.0.0.1 (localStorage survives reloads there; on file:// it can be lost between reloads).
const http = require('http');
const server = http.createServer((req, res) => {
  const f = path.join(dir, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0].replace(/\.\./g, ''));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(f)] || 'text/plain' }); res.end(d); });
});
let url = '';
const ok = (n, c, x) => console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' ' + x : ''));
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); url = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await chromium.launch();
  const open = async (pl, seed, lang = 'en') => {
    const ctx = await b.newContext({ viewport: { width: 1024, height: 900 } });
    await ctx.addInitScript(([pl, seed, lang]) => {
      if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('pc_lang', JSON.stringify(lang)); localStorage.setItem('pc_plang', JSON.stringify(pl));
        for (const k in seed) localStorage.setItem(k, JSON.stringify(seed[k])); }
    }, [pl, seed, lang]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.ctx = ctx;
    await p.goto(url); await p.waitForTimeout(400); return p;
  };
  const rows = (p, c) => p.evaluate(async (c) => (await LB.rows('', c)).map(r => r.id + '|' + r.plang + '|' + !!r.sample), c);
  const week = (new Date()).toISOString().slice(0, 10);

  // 1) Legacy storage (no plang anywhere, old v2 week) must survive and count as French
  const legacyRuns = [{ mod: 'sprint', at: '2026-11-01T10:00:00Z', score: 40, wpm: 44, acc: 95, lvl: 'B1' }];
  let p = await open('fr', { pc_runs: legacyRuns });
  ok('legacy run without plang shows in FR personal list', await p.evaluate(() => Board.load().filter(x => rowLang(x) === 'fr').length) === 1);
  const real = await p.evaluate(async () => { const w = LB.weekId(); localStorage.setItem('pc_week', JSON.stringify({ week: w, v: 2, rows: [{ id: 'old1', nick: 'Legacy', wpm: 30, acc: 95, score: 27, at: w + 'T09:00:00Z', mod: 'sprint', lvl: 'B1' }] })); return (await LB.rows('B1', 'fr')).some(r => r.id === 'old1'); });
  ok('old v2 week without plang migrates to FR (real row kept)', real);
  await p.reload(); await p.waitForFunction(() => window.LB && window.PC_BANK); await p.waitForTimeout(300);
  ok('migrated storage is v3 and keeps the legacy row as fr', await p.evaluate(async () => { await LB.rows('', 'fr'); const o = JSON.parse(localStorage.getItem('pc_week')); const r = o.rows.find(x => x.id === 'old1'); return o.v === 3 && !!r && r.plang === 'fr'; }));
  ok('legacy row does NOT appear in EN or ES', await p.evaluate(async () => !(await LB.rows('', 'en')).some(r => r.id === 'old1') && !(await LB.rows('', 'es')).some(r => r.id === 'old1')));
  ok('every language has example rows of its own (4 per level)', await p.evaluate(async () => { for (const c of ['fr', 'en', 'es']) { const r = (await LB.rows('', c)).filter(x => x.sample); if (r.length !== 20 || !r.every(x => x.plang === c)) return false; } return true; }));
  ok('sample ids unique across languages', await p.evaluate(async () => { const ids = []; for (const c of ['fr', 'en', 'es']) (await LB.rows('', c)).forEach(r => ids.push(r.id)); return new Set(ids).size === ids.length; }));
  ok('no errors (fr)', p.errs.length === 0, JSON.stringify(p.errs));
  await p.ctx.close();

  // 2) Submitting in EN tags the row en and keeps it out of FR / ES
  p = await open('en', {});
  const res = await p.evaluate(async () => {
    const run = { typed: 200, score: 40.5, wpm: 45, acc: 95, elapsed: 60, level: 'B1' };
    run.score = Math.round(run.wpm * Math.pow(run.acc / 100, 2) * 10) / 10;
    const r = await LB.submit(run, 'TestEN', '');
    const o = JSON.parse(localStorage.getItem('pc_week'));
    const mine = o.rows.find(x => x.id === r.id);
    return { ok: r.ok, plang: mine && mine.plang, fr: (await LB.rows('', 'fr')).some(x => x.id === r.id), en: (await LB.rows('', 'en')).some(x => x.id === r.id), es: (await LB.rows('', 'es')).some(x => x.id === r.id), active: PC_BANK.active };
  });
  ok('EN submit ok and active = en', res.ok && res.active === 'en');
  ok('stored row carries plang en', res.plang === 'en');
  ok('EN row visible in EN, hidden in FR and ES', res.en && !res.fr && !res.es);
  // personal board (Board.save) per language
  const pb = await p.evaluate(() => { const a = Board.save({ score: 30, wpm: 33, acc: 95, lvl: 'B1' }); const all = Board.load(); return { rank: a, plangs: all.map(x => x.plang) }; });
  ok('personal best saved with plang en, rank 1 in EN', pb.rank === 1 && pb.plangs.every(c => c === 'en'));
  // ranking sheet shows only the active language
  await p.click('#boardBtn'); await p.waitForTimeout(300);
  const sheet = await p.evaluate(() => ({ note: document.querySelector('#lbBox .rv-note').textContent, nicks: [...document.querySelectorAll('#lbBox tbody tr td:nth-child(2)')].map(x => x.textContent) }));
  ok('sheet note names the practice language', /^English/.test(sheet.note), sheet.note);
  ok('sheet (level B1 pre-selected by the run) lists TestEN', await p.evaluate(async () => { LBView.pick('B1'); await LBView.sheet(); return /TestEN/.test(document.getElementById('lbBox').textContent); }));
  const bt = await p.$$eval('#boardTable tbody tr td:nth-child(2)', e => e.map(x => x.textContent).join()); ok('personal list shows exactly the EN run (30)', bt === '30', bt);
  ok('no errors (en)', p.errs.length === 0, JSON.stringify(p.errs));
  await p.ctx.close();

  // 3) Switch language through the real button: rows follow PC_BANK.active, no stale timers
  p = await open('en', { pc_runs: [{ mod: 'sprint', at: '2026-11-02T10:00:00Z', score: 99, wpm: 90, acc: 99, lvl: 'B1', plang: 'en' }, { mod: 'sprint', at: '2026-11-03T10:00:00Z', score: 11, wpm: 12, acc: 95, lvl: 'B1' }] });
  ok('EN personal list shows only EN run', await p.evaluate(() => { Board.render(); const c = [...document.querySelectorAll('#boardTable tbody tr td:nth-child(2)')].map(x => x.textContent).join(); return c === '99'; }));
  await p.click('[data-pcode=fr]'); await p.waitForTimeout(1200); await p.waitForFunction(() => window.LB && PC_BANK.active === 'fr' && document.querySelector('[data-pcode=fr]').getAttribute('aria-pressed') === 'true', null, { timeout: 8000 });
  ok('after switching to FR the personal list shows only the FR (legacy) run', await p.evaluate(() => { Board.render(); const c = [...document.querySelectorAll('#boardTable tbody tr td:nth-child(2)')].map(x => x.textContent).join(); return c === '11'; }));
  ok('FR ranking sheet names French', await p.evaluate(async () => { await LBView.sheet(); return /^(French|Francés)/.test(document.querySelector('#lbBox .rv-note').textContent); }));
  ok('no errors after switch', p.errs.length === 0, JSON.stringify(p.errs));
  await p.ctx.close();

  // 4) Spanish interface: language name and rules text
  p = await open('es', {}, 'es');
  await p.click('#boardBtn'); await p.waitForTimeout(300);
  ok('ES sheet note starts with Español', /^Español/.test(await p.textContent('#lbBox .rv-note')));
  ok('rules text mentions the practice language', /idioma de práctica/.test(await p.textContent('#lbBox')));
  await p.ctx.close();
  console.log('DONE'); await b.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true });
})();
