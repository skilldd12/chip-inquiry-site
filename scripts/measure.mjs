import puppeteer from "puppeteer-core";
const url = process.argv[2];
const w = Number(process.argv[3] || 390);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true });
await p.goto(url, { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 1500));
const info = await p.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { sel, x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), h: Math.round(r.height) }; };
  return {
    inner: pick(".site-header__inner"),
    wordmark: pick(".wordmark"),
    locale: pick(".locale-switch"),
    toggle: pick(".menu-toggle"),
    heroContent: pick(".hero__content"),
    title: pick("#hero-title"),
    titleLines: (() => { const el = document.querySelector("#hero-title"); if(!el) return 0; const lh = parseFloat(getComputedStyle(el).lineHeight)||1; return Math.round(el.getBoundingClientRect().height/lh); })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
