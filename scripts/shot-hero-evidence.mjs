/**
 * 首屏动态证据：进入 → 滚动中段 → 滚动到底（交给品牌区）→ 反向回滚 → 指针悬停。
 * 输出同名 png 与一段 JSON 状态，用于证明"同一条相机路径"与"高光真实可见"。
 *
 * 用法：node scripts/shot-hero-evidence.mjs <url> <prefix> [w] [h]
 */
import puppeteer from "puppeteer-core";

const [url, prefix, w = "1440", h = "1000"] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
await wait(4200);

const probe = () =>
  page.evaluate(() => {
    const spec = document.querySelector(".hero__specular");
    const title = document.querySelector(".hero__title");
    const canvas = document.querySelector(".hero__canvas canvas");
    const cs = spec ? getComputedStyle(spec) : null;
    return {
      theme: document.querySelector(".hero")?.dataset.theme,
      ready: document.querySelector(".hero__canvas")?.dataset.ready,
      canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
      specular: cs ? { visibility: cs.visibility, opacity: cs.opacity } : null,
      titleVar: title ? getComputedStyle(title).getPropertyValue("--mx").trim() : null,
      scrollY: Math.round(window.scrollY),
      scrollMax: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    };
  });

const shots = {};
await page.screenshot({ path: `${prefix}-1-enter.png` });
shots.enter = await probe();

/* 悬停标题 + 器件区：验证高光与金属渐变真的出现 */
await page.mouse.move(Number(w) * 0.42, Number(h) * 0.34, { steps: 12 });
await wait(700);
const titleBox = await page.evaluate(() => {
  const r = document.querySelector(".hero__title")?.getBoundingClientRect();
  return r ? { x: r.x + r.width * 0.6, y: r.y + r.height * 0.5 } : null;
});
if (titleBox) {
  await page.mouse.move(titleBox.x, titleBox.y, { steps: 8 });
  await wait(500);
}
await page.screenshot({ path: `${prefix}-2-hover.png` });
shots.hover = await probe();

/* 首屏钉住区间是 170vh，按视口倍数取点，不能按整页比例（否则会直接跳到下方章节） */
const vh = Number(h);
await page.evaluate((y) => window.scrollTo(0, y), Math.round(vh * 0.9));
await wait(1600);
await page.screenshot({ path: `${prefix}-3-mid.png` });
shots.mid = await probe();

await page.evaluate((y) => window.scrollTo(0, y), Math.round(vh * 1.75));
await wait(1600);
await page.screenshot({ path: `${prefix}-4-exit.png` });
shots.exit = await probe();

/* 反向：从底回到顶，检查路径可逆、无重影 */
await page.evaluate(() => window.scrollTo(0, 0));
await wait(1800);
await page.screenshot({ path: `${prefix}-5-reverse.png` });
shots.reverse = await probe();

console.log(JSON.stringify({ prefix, shots, errors }, null, 2));
await browser.close();
