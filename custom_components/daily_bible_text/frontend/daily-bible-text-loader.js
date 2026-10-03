// Daily Bible Text – bootstrap loader.
// Loads daily-bible-text-cards.js, retries on failure/hang and shows a small
// on-screen notice (with diagnostics) if the cards still cannot be loaded.
const DBT_TAGS = [
  'daily-bible-text-card-editor',
  'daily-bible-text-card',
  'daily-bible-text-inline-card-editor',
  'daily-bible-text-inline-card',
];
const DBT_TIMEOUT_MS = 4000;
const DBT_DELAYS_MS = [0, 1000, 2500, 5000];

const dbtLog = [];
const dbtNote = (msg) => dbtLog.push(`${(performance.now() / 1000).toFixed(1)}s ${msg}`);
const dbtAllDefined = () => DBT_TAGS.every((t) => customElements.get(t));
const dbtSleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dbtSelf = new URL(import.meta.url);
const dbtMain = new URL('daily-bible-text-cards.js', dbtSelf);
dbtMain.search = dbtSelf.search;

async function dbtAttempt(n) {
  const url = new URL(dbtMain);
  if (n > 0) url.searchParams.set('r', `${n}-${Date.now()}`);
  dbtNote(`import #${n}`);
  try {
    await Promise.race([
      import(url.href),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${DBT_TIMEOUT_MS}ms`)), DBT_TIMEOUT_MS)),
    ]);
  } catch (err) {
    dbtNote(`error: ${(err && err.message) || err}`);
  }
  if (dbtAllDefined()) {
    dbtNote('ok');
    return true;
  }
  dbtNote('elements missing');
  return false;
}

function dbtShowNotice() {
  const res = performance
    .getEntriesByType('resource')
    .filter((e) => e.name.includes('daily-bible-text'))
    .map((e) => `${e.name.split('/').pop()} ${Math.round(e.duration)}ms size=${e.transferSize} status=${e.responseStatus ?? '?'}`);
  const text = ['Daily Bible Text: Karten konnten nicht geladen werden.', ...dbtLog, ...res].join('\n');
  console.error(text);
  const box = document.createElement('pre');
  box.textContent = text;
  box.style.cssText =
    'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;margin:0;padding:10px;' +
    'background:#b71c1c;color:#fff;font:11px/1.4 monospace;white-space:pre-wrap;border-radius:8px;';
  box.addEventListener('click', () => box.remove());
  document.body.appendChild(box);
}

(async () => {
  if (dbtAllDefined()) return;
  for (let i = 0; i < DBT_DELAYS_MS.length; i += 1) {
    await dbtSleep(DBT_DELAYS_MS[i]);
    if (await dbtAttempt(i)) return;
  }
  dbtShowNotice();
})();
