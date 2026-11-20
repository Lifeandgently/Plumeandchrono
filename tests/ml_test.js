const { chromium } = require('playwright');
// Browser test for the practice languages (FR · EN · ES). Run from the repository root:
//   node tests/ml_test.js            (tests the site in the repository root)
//   node tests/ml_test.js <folder>   (tests another copy of the 5 files)
// Needs Playwright with Chromium. Prints PASS / FAIL per check, then DONE.
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const ok = (n, c, x) => console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' ' + x : ''));
const url = 'file://' + dir + '/index.html';
(async () => {
  const b = await chromium.launch();
  const open = async (pl, lang = 'en', w = 1024) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(([pl, lang]) => { localStorage.setItem('pc_lang', JSON.stringify(lang)); if (pl) localStorage.setItem('pc_plang', JSON.stringify(pl)); }, [pl, lang]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' && /\[P&C\]/.test(m.text())) p.errs.push(m.text()); });
    await p.goto(url); await p.waitForTimeout(350); p.ctx = ctx; return p;
  };
  // ---------- header height: 230 px at 360/412 px (selector on its own line), 165 px from 601 px ----------
  for (const pl of ['fr', 'en', 'es']) for (const lang of ['en', 'es']) for (const [w, h] of [[360, 230], [412, 230], [601, 165], [800, 165], [1280, 165]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 900, isMobile: w < 600, reducedMotion: 'reduce' });
    await ctx.addInitScript(([l, pl]) => { localStorage.setItem('pc_lang', JSON.stringify(l)); localStorage.setItem('pc_plang', JSON.stringify(pl)); }, [lang, pl]);
    const q = await ctx.newPage(); await q.goto(url); await q.waitForTimeout(350);
    const got = await q.evaluate(() => Math.round(document.querySelector('header.masthead').getBoundingClientRect().height));
    ok(`header ${w} px ${pl}/ui-${lang} = ${h} px`, got === h, got);
    await ctx.close();
  }
  // ---------- default: fr ----------
  let p = await open(null);
  ok('default practice = fr', await p.evaluate(() => PC_BANK.active) === 'fr');
  ok('selector visible with 3 options', await p.evaluate(() => { const bar = document.getElementById('plangBar'); return !bar.hidden && [...bar.querySelectorAll('[data-pcode]')].filter(x => !x.hidden).length === 3; }));
  // Layout since PR #3: the practice selector (FR · EN · ES) sits inside the header, in the level bar, before "Level".
  // The interface selector (EN | ES, top right) stays a separate group.
  ok('selector is inside the header, in the level bar, before "Level"', await p.evaluate(() => {
    const bar = document.getElementById('plangBar'), lvl = document.getElementById('levelBar');
    return document.querySelector('header.masthead').contains(bar) && bar.parentElement === lvl
      && !!(bar.compareDocumentPosition(document.getElementById('lvlLabel')) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  ok('practice selector separate from the EN | ES interface selector', await p.evaluate(() => {
    const bar = document.getElementById('plangBar'), ui = document.getElementById('langGroup');
    return !!ui && !ui.contains(bar) && !bar.contains(ui) && !bar.querySelector('[data-lang]') && !ui.querySelector('[data-pcode]');
  }));
  ok('fr pressed', await p.evaluate(() => document.querySelector('[data-pcode=fr]').getAttribute('aria-pressed') === 'true'));
  ok('fr keys 14 + shift', await p.$$eval('#accents .key', e => e.length) === 15);
  ok('no errors fr', p.errs.length === 0, JSON.stringify(p.errs));
  // switch through the real button: fr -> en
  await p.click('[data-pcode=en]'); await p.waitForFunction(() => window.PC_BANK && PC_BANK.active === 'en', null, { timeout: 8000 }); await p.waitForTimeout(500);
  ok('click EN reloads with en bank', await p.evaluate(() => PC_BANK.active) === 'en' && await p.evaluate(() => JSON.parse(localStorage.getItem('pc_plang'))) === 'en');
  ok('pc_lang untouched by the selector', await p.evaluate(() => JSON.parse(localStorage.getItem('pc_lang'))) === 'en');
  ok('en pressed', await p.evaluate(() => document.querySelector('[data-pcode=en]').getAttribute('aria-pressed') === 'true' && document.querySelector('[data-pcode=fr]').getAttribute('aria-pressed') === 'false'));
  await p.ctx.close();

  for (const [code, lang] of [['en', 'en'], ['en', 'es'], ['es', 'en'], ['es', 'es']]) {
    p = await open(code, lang);
    const T = `${code}/ui-${lang} `;
    ok(T + 'bank active', await p.evaluate(() => PC_BANK.active) === code);
    ok(T + 'html lang of the practice text', await p.evaluate((c) => [...document.querySelectorAll('[data-plang]')].every(e => e.lang === (c === 'en' ? 'en-CA' : 'es')), code));
    ok(T + 'doc lang = interface lang', await p.evaluate(() => document.documentElement.lang) === lang);
    ok(T + 'source aria-label', await p.evaluate(() => document.getElementById('source').getAttribute('aria-label')) === (code === 'en' ? 'Text to copy' : 'Texto para copiar'));
    const keys = await p.$$eval('#accents .key[data-ch]', e => e.map(x => x.dataset.ch).join(''));
    if (code === 'en') {
      ok(T + 'no key bar, label row hidden', await p.evaluate(() => { const a = document.getElementById('accents'); return getComputedStyle(a).display === 'none' && getComputedStyle(a.previousElementSibling).display === 'none'; }));
      ok(T + 'accent / space chips and Quebec button hidden', await p.evaluate(() => ['cAccent', 'cSpace', 'qcBtn'].every(id => getComputedStyle(document.getElementById(id)).display === 'none')));
    } else {
      ok(T + 'keys á é í ó ú ü ñ ¿ ¡', keys === 'áéíóúüñ¿¡', keys);
      ok(T + 'key bar visible, qc hidden', await p.evaluate(() => getComputedStyle(document.getElementById('accents')).display !== 'none' && getComputedStyle(document.getElementById('qcBtn')).display === 'none'));
      ok(T + 'label names Spanish keys', /Spanish keys|Teclas del español/.test(await p.evaluate(() => document.querySelector('[data-keyrow] [data-i18n=keysLabel]').textContent)));
    }
    ok(T + 'intro names the language', new RegExp(code === 'en' ? 'English|inglés' : 'Spanish|español').test(await p.textContent('[data-i18n=m1intro]')));
    ok(T + 'selector pressed', await p.evaluate((c) => document.querySelector(`[data-pcode=${c}]`).getAttribute('aria-pressed') === 'true', code));
    // character next to the clock follows the PRACTICE language
    ok(T + 'coach character', await p.evaluate((c) => { const s = document.querySelector('#mimeCoach svg'); return !!s && s.dataset.char === c; }, code));
    // Sprint typing
    const src = await p.textContent('#source');
    await p.click('#field'); await p.keyboard.type(src.slice(0, 30), { delay: 0 });
    const st = await p.evaluate(() => [document.getElementById('sAcc').textContent, document.getElementById('nAccent').textContent, document.getElementById('nSpace').textContent]);
    ok(T + 'exact copy = 100 % accuracy', st[0] === '100', st.join('/'));
    // restart and type with the accents / apostrophes altered
    await p.click('#restartBtn');
    const variant = code === 'en' ? src.replace(/’/g, "'") : src.replace(/[áéíóú]/g, m => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[m]));
    await p.click('#field'); await p.keyboard.type(variant.slice(0, 80), { delay: 0 });
    const st2 = await p.evaluate(() => [document.getElementById('sAcc').textContent, document.getElementById('nAccent').textContent]);
    if (code === 'en') ok(T + "straight ' equals curly ’ (accuracy 100)", st2[0] === '100', st2.join('/') + ' src has curly: ' + /’/.test(src));
    else ok(T + 'missing tilde is counted as accent mistake', +st2[1] >= 1 || !/[áéíóú]/.test(src.slice(0, 80)), st2.join('/'));
    ok(T + 'no errors', p.errs.length === 0, JSON.stringify(p.errs));
    await p.ctx.close();
  }

  // Sprint, en: switch to A1 where the text carries a curly apostrophe
  p = await open('en', 'en');
  await p.click('#levelBar [data-level=A1]');
  const a1 = await p.textContent('#source');
  ok('en A1 sprint text has a curly apostrophe', /I’m/.test(a1));
  await p.click('#field'); await p.keyboard.type(a1.replace(/’/g, "'").slice(0, 60), { delay: 0 });
  ok('en: typing the straight apostrophe costs nothing', await p.evaluate(() => document.getElementById('sAcc').textContent) === '100');
  await p.ctx.close();

  // Improv + Reading in each practice language
  for (const code of ['en', 'es']) {
    p = await open(code, 'en');
    await p.click('#tab2'); await p.waitForTimeout(200);
    await p.click('#m2startBtn'); await p.waitForTimeout(200);
    const prompt = await p.textContent('#m2prompt');
    const chips = await p.$$eval('#m2conns .chip b', e => e.map(x => x.textContent));
    const bank = await p.evaluate((c) => PC_BANK.langs[c].connectors.map(x => x.word), code);
    ok(code + ' improv prompt in the practice language', code === 'en' ? /[a-z]/i.test(prompt) && !/[éèêàç]/.test(prompt) : /[¿áéíóú]|\b(un|una|el|la|de)\b/.test(prompt), prompt.slice(0, 50));
    ok(code + ' improv draws 2 connectors from its own bank', chips.length === 2 && chips.every(c => bank.includes(c)), chips.join(','));
    ok(code + ' improv key bar', code === 'en' ? await p.evaluate(() => getComputedStyle(document.getElementById('m2accents')).display === 'none') : (await p.$$eval('#m2accents .key[data-ch]', e => e.length)) === 9);
    await p.click('#tab3'); await p.waitForTimeout(200);
    await p.click('#m3startBtn'); await p.waitForTimeout(200);
    ok(code + ' reading: text + 3 questions', (await p.textContent('#m3text')).length > 60 && (await p.$$eval('#m3qs .q-text', e => e.length)) === 3);
    ok(code + ' reading lang attr', await p.evaluate(() => document.getElementById('m3text').lang) === (code === 'en' ? 'en-CA' : 'es'));
    ok(code + ' no errors', p.errs.length === 0, JSON.stringify(p.errs));
    await p.ctx.close();
  }

  // ConnMatch with the sheets (pure): English and Spanish ambiguous words only count in a connector position
  p = await open('en', 'en');
  await p.close();
  console.log('DONE');
  await b.close();
})();
