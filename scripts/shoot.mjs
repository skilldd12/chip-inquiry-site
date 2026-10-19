/**
 * Browser evidence: screenshots at three widths plus layout/console checks.
 * Usage: node scripts/shoot.mjs [baseUrl] [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:4310";
const OUT = path.resolve(process.argv[3] || "../shots");
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const LOCALES = ["zh", "en", "ru"];
const PAGES = ["", "brands", "capabilities", "warehouse-quality", "about", "contact", "inquiry", "faq", "privacy", "terms"];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--disable-gpu", "--font-render-hinting=none"],
});

const report = { generatedAt: new Date().toISOString(), base: BASE, shots: [], checks: [], console: [] };

async function newPage(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") report.console.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", (err) => report.console.push({ url: page.url(), text: `pageerror: ${err.message}` }));
  return page;
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, ...opts });
  report.shots.push(path.relative(OUT, file));
  return file;
}

/* ---------- desktop: hero at three scroll states ---------- */
{
  const page = await newPage(1440, 900);
  await page.goto(`${BASE}/zh`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3600));
  await shot(page, "hero-1440-state1");

  const pinLength = await page.evaluate(() => window.innerHeight * 1.9);
  await page.evaluate((y) => window.scrollTo(0, y), pinLength * 0.45);
  await new Promise((r) => setTimeout(r, 1400));
  await shot(page, "hero-1440-state2");

  await page.evaluate((y) => window.scrollTo(0, y), pinLength * 0.95);
  await new Promise((r) => setTimeout(r, 1400));
  await shot(page, "hero-1440-state3");

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));

  // overflow + typography checks
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  report.checks.push({ page: "/zh", width: 1440, overflow });

  // full page capture (scroll to bottom first so reveals fire, then back)
  const height = await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    return document.body.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 1200));
  await shot(page, "home-1440-full", { fullPage: true, captureBeyondViewport: true });
  report.checks.push({ page: "/zh", height });
  await page.close();
}

/* ---------- every page at 1440 ---------- */
for (const p of PAGES) {
  const page = await newPage(1440, 900);
  const url = `${BASE}/en${p ? `/${p}` : ""}`;
  const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const name = `page-en-${p || "home"}-1440`;
  await shot(page, name, { fullPage: true, captureBeyondViewport: true });
  const check = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    h1: document.querySelector("h1")?.textContent?.trim().slice(0, 80) || null,
  }));
  report.checks.push({ page: url, status: res?.status(), ...check });
  await page.close();
}

/* ---------- mobile + tablet, ru + zh ---------- */
for (const [w, h, tag] of [
  [390, 844, "390"],
  [768, 1024, "768"],
]) {
  for (const locale of ["zh", "ru"]) {
    for (const p of ["", "brands", "inquiry", "capabilities"]) {
      const page = await newPage(w, h);
      const url = `${BASE}/${locale}${p ? `/${p}` : ""}`;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 900));
      const check = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScroll: document.body.scrollWidth,
      }));
      report.checks.push({ url, width: w, ...check });
      if (p === "" ) {
        await shot(page, `home-${locale}-${tag}`);
      }
      if (p === "inquiry") {
        await shot(page, `inquiry-${locale}-${tag}`, { fullPage: true, captureBeyondViewport: true });
      }
      if (p === "brands" && locale === "ru") {
        await shot(page, `brands-ru-${tag}`);
      }
      await page.close();
    }
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: report.shots.length, checks: report.checks.length, consoleErrors: report.console.length }, null, 2));
