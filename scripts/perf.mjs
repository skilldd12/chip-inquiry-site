/**
 * 本地性能采样：在**生产构建**（next build + next start）上运行。
 *
 * 采集项：
 *   - TTFB / FCP / LCP（PerformanceObserver，逐页累计最大 LCP 元素）
 *   - CLS（layout-shift，排除用户输入后的位移）
 *   - 「输入延迟」：用 Event Timing API 记录真实交互（点击导航、聚焦输入、键盘输入）
 *     的单次事件耗时。**这是 INP 的近似值，不是 INP**：INP 需真实用户会话分布，
 *     这里只说明「本机单次交互的最差耗时」。
 *
 * 用法：node scripts/perf.mjs http://localhost:4311 ../shots
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const base = process.argv[2] || "http://localhost:4311";
const outDir = path.resolve(process.argv[3] || "../shots");
const chrome =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const pages = [
  { name: "home-zh", url: "/zh", interact: true },
  { name: "brands-zh", url: "/zh/brands" },
  { name: "inquiry-zh", url: "/zh/inquiry", interact: true },
  { name: "home-en", url: "/en" },
  { name: "home-ru", url: "/ru" },
  { name: "capabilities-zh", url: "/zh/capabilities" },
];

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars"],
});

const results = [];

for (const target of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);

  await page.evaluateOnNewDocument(() => {
    window.__perf = { lcp: 0, lcpEl: "", cls: 0, events: [], fcp: 0, ttfb: 0, startedAt: 0 };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint" && !window.__perf.fcp) {
          window.__perf.fcp = Math.round(entry.startTime);
        }
      }
    }).observe({ type: "paint", buffered: true });

    window.addEventListener("DOMContentLoaded", () => {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) window.__perf.ttfb = Math.round(nav.responseStart);
    });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.lcp = Math.max(window.__perf.lcp, entry.startTime);
        const el = entry.element;
        window.__perf.lcpEl = el
          ? `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}`
          : "unknown";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__perf.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.events.push({
          name: entry.name,
          duration: Math.round(entry.duration),
        });
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true });

  });

  const started = Date.now();
  await page.goto(`${base}${target.url}`, { waitUntil: "networkidle2", timeout: 60000 });
  const loadMs = Date.now() - started;
  await new Promise((r) => setTimeout(r, 2600));

  /* 先固定页面指标，再做交互（交互不跨页，避免 document 被重置） */
  const base_ = await page.evaluate(() => {
    const p = window.__perf;
    return { ttfb: p.ttfb, fcp: p.fcp, lcp: Math.round(p.lcp), lcpEl: p.lcpEl, cls: Number(p.cls.toFixed(4)) };
  });

  let worstEvents = [];
  if (target.interact) {
    await page.evaluate(() => {
      window.__perf.events = [];
    });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const summary = await page.$("details > summary");
    if (summary) await summary.click({ delay: 12 }).catch(() => {});
    /* 刻意避开 type=file：点击文件输入会拉起系统选择框，测出来的是对话框耗时 */
    const input =
      (await page.$("#mpn-0")) ||
      (await page.$("#company")) ||
      (await page.$("input.input")) ||
      (await page.$("textarea"));
    if (input) {
      await input.click({ delay: 10 }).catch(() => {});
      await page.keyboard.type("STM32F103", { delay: 16 }).catch(() => {});
    }
    const brandCell = await page.$(".brand-cell a");
    if (brandCell) await brandCell.hover().catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
    worstEvents = await page.evaluate(() => {
      const events = window.__perf.events.filter((e) => !/over|out|move/.test(e.name));
      return events.sort((a, b) => b.duration - a.duration).slice(0, 4);
    });
  }

  const perf = { ...base_, worstEvents };

  results.push({ page: target.name, navLoadMs: loadMs, ...perf });
  console.log(
    `${target.name.padEnd(18)} TTFB ${String(perf.ttfb).padStart(4)}ms  FCP ${String(
      perf.fcp
    ).padStart(4)}ms  LCP ${String(perf.lcp).padStart(4)}ms  CLS ${String(perf.cls).padEnd(
      7
    )} ${perf.lcpEl}  最长事件 ${perf.worstEvents[0]?.duration ?? "-"}ms`
  );

  await page.close();
}

await browser.close();
await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "perf.json"),
  `${JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      base,
      note: "本地生产构建 + 本机 Chrome，非真实网络/真机；INP 为 Event Timing 单次最差耗时近似值",
      results,
    },
    null,
    2
  )}\n`,
  "utf8"
);
console.log(`\n写入 ${path.join(outDir, "perf.json")}`);
