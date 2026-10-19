/**
 * 线上站点端到端验收：真实浏览器打开 GitHub Pages 上的站点。
 * 用法：node scripts/check-live.mjs [baseUrl] [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = (process.argv[2] || "https://skilldd12.github.io/chip-inquiry-site").replace(/\/$/, "");
const OUT = path.resolve(process.argv[3] || "../shots-live");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || "";

fs.mkdirSync(OUT, { recursive: true });

const report = { base: BASE, at: new Date().toISOString(), checks: [], shots: [], failed: [], console: [] };
const pass = (name, ok, detail = "") => {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--hide-scrollbars",
    "--disable-gpu",
    "--font-render-hinting=none",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    ...(PROXY ? [`--proxy-server=${PROXY}`] : []),
  ],
});

function watch(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error") report.console.push({ tag, text: m.text().slice(0, 300) });
  });
  page.on("pageerror", (e) => report.console.push({ tag, text: `pageerror: ${e.message}` }));
  page.on("response", (r) => {
    if (r.status() >= 400) report.failed.push({ tag, status: r.status(), url: r.url() });
  });
  page.on("requestfailed", (r) =>
    report.failed.push({ tag, status: "failed", url: r.url(), err: r.failure()?.errorText }),
  );
}

/* ---------- 桌面：首屏 + 真实点击导航 ---------- */
const desk = await browser.newPage();
watch(desk, "desktop");
await desk.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const t0 = Date.now();
const resp = await desk.goto(`${BASE}/zh/`, { waitUntil: "domcontentloaded", timeout: 60000 });
pass("首页返回 200", resp?.status() === 200, `status=${resp?.status()} ${Date.now() - t0}ms`);
await desk.waitForSelector("h1", { timeout: 30000 });
const title = await desk.$eval("h1", (el) => el.innerText.replace(/\s+/g, " ").trim());
pass("中文首屏标题可读", title.length > 6, title);
await new Promise((r) => setTimeout(r, 2200));
await desk.screenshot({ path: path.join(OUT, "live-desktop-zh.png") });
report.shots.push("live-desktop-zh.png");

const hasPanel = await desk.evaluate(() => !!document.querySelector(".hero__aside"));
pass("首屏没有开发态面板", !hasPanel);

const devNotes = await desk.evaluate(() => {
  const t = document.body.innerText;
  return ["RENDER PRE-BAKED", "FORMAT QFP", "BRANDS 15", "待补"].filter((s) => t.includes(s));
});
pass("正文无开发备注", devNotes.length === 0, devNotes.join(",") || "clean");

/* 真实点击站内导航（不是直接输网址），验证客户端路由与 RSC 载荷 */
const navHref = await desk.evaluate(() => {
  const a = [...document.querySelectorAll('header a[href*="/brands"]')][0];
  return a ? a.getAttribute("href") : null;
});
pass("页头存在品牌导航", !!navHref, navHref || "");
if (navHref) {
  await desk.evaluate(() => {
    const a = [...document.querySelectorAll('header a[href*="/brands"]')][0];
    a.scrollIntoView({ block: "center" });
    a.click();
  });
  await desk.waitForFunction(() => location.pathname.includes("/brands"), { timeout: 30000 });
  await desk.waitForSelector("h1", { timeout: 30000 });
  const h1 = await desk.$eval("h1", (el) => el.innerText.replace(/\s+/g, " ").trim());
  pass("点击导航后是品牌页", /品牌|Brand/i.test(h1), `${desk.url()} | ${h1}`);
  await new Promise((r) => setTimeout(r, 900));
  await desk.screenshot({ path: path.join(OUT, "live-desktop-brands.png") });
  report.shots.push("live-desktop-brands.png");

  /* 浏览器返回，验证回退不白屏、不重影 */
  await desk.goBack({ waitUntil: "domcontentloaded" });
  await desk.waitForSelector("h1", { timeout: 30000 });
  const backTitle = await desk.$eval("h1", (el) => el.innerText.replace(/\s+/g, " ").trim());
  pass("返回首页仍有内容", backTitle.length > 6, backTitle);
}

/* 询价页：静态版应当明确告知不落库 */
const inq = await browser.newPage();
watch(inq, "inquiry");
await inq.setViewport({ width: 1440, height: 900 });
await inq.goto(`${BASE}/zh/inquiry/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await inq.waitForSelector("form", { timeout: 30000 });
const notice = await inq.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
pass("询价页有静态版说明", /静态|GitHub Pages|不会提交|示例/.test(notice), notice.match(/[^。]{0,40}(静态|GitHub Pages)[^。]{0,40}/)?.[0] || "见截图");
await inq.screenshot({ path: path.join(OUT, "live-desktop-inquiry.png"), fullPage: false });
report.shots.push("live-desktop-inquiry.png");

/* ---------- 移动端：390 宽不横向溢出 ---------- */
for (const locale of ["zh", "ru"]) {
  const m = await browser.newPage();
  watch(m, `mobile-${locale}`);
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/${locale}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await m.waitForSelector("h1", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  const overflow = await m.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    wide: [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 4)
      .map((el) => `${el.tagName}.${el.className}`.slice(0, 60)),
  }));
  pass(`390 宽 ${locale} 无横向溢出`, overflow.docW <= overflow.winW + 1, `scrollW=${overflow.docW} win=${overflow.winW} ${overflow.wide.join(" | ")}`);
  await m.screenshot({ path: path.join(OUT, `live-mobile-${locale}.png`) });
  report.shots.push(`live-mobile-${locale}.png`);
  await m.close();
}

/* ---------- 无 WebGL + 减少动效也能用 ---------- */
const noGl = await browser.newPage();
watch(noGl, "no-webgl");
await noGl.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await noGl.evaluateOnNewDocument(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (String(type).includes("webgl")) return null;
    return orig.call(this, type, ...rest);
  };
});
await noGl.setViewport({ width: 1280, height: 800 });
await noGl.goto(`${BASE}/zh/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await noGl.waitForSelector("h1", { timeout: 30000 });
const fallback = await noGl.evaluate(() => {
  const t = document.querySelector("h1")?.innerText.trim() || "";
  const poster = getComputedStyle(document.querySelector(".chip-hero__poster") || document.body).backgroundImage;
  return { title: t, hasPoster: poster !== "none" };
});
pass("无 WebGL + 减少动效仍可读", fallback.title.length > 6, `title=${fallback.title.slice(0, 24)} poster=${fallback.hasPoster}`);
await noGl.screenshot({ path: path.join(OUT, "live-reduced-motion.png") });
report.shots.push("live-reduced-motion.png");

/* ---------- 汇总 ---------- */
const hardFails = report.failed.filter(
  // Next 预取在跳转时会被主动中断（net::ERR_ABORTED），不是缺陷
  (f) => f.err !== "net::ERR_ABORTED" && !/favicon|\.map$|analytics|doubleclick/.test(f.url || ""),
);
pass("无 4xx/5xx 请求", hardFails.length === 0, hardFails.slice(0, 4).map((f) => `${f.status} ${f.url.split("/").slice(-1)[0]}`).join(" | ") || "无真实失败请求");
pass("无控制台报错", report.console.length === 0, report.console.slice(0, 3).map((c) => c.text).join(" | "));

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
const bad = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - bad.length}/${report.checks.length} passed`);
if (bad.length) {
  console.log("FAILED:", bad.map((b) => b.name).join("; "));
  process.exitCode = 1;
}
