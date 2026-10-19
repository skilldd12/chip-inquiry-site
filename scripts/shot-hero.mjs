import puppeteer from "puppeteer-core";
const [url, prefix, w = "1440", h = "1000", ...scrolls] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
await new Promise((r) => setTimeout(r, 4200));
const points = scrolls.length ? scrolls.map(Number) : [0];
for (const p of points) {
  await page.evaluate((ratio) => window.scrollTo(0, window.innerHeight * ratio), p);
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: `${prefix}-${String(p).replace(".", "_")}.png` });
  console.log("shot", `${prefix}-${String(p).replace(".", "_")}.png`);
}
const info = await page.evaluate(() => {
  const c = document.querySelector(".hero__canvas canvas");
  return { canvas: !!c, w: c?.width ?? 0, h: c?.height ?? 0, ready: document.querySelector(".hero__canvas")?.dataset.ready };
});
console.log(JSON.stringify({ info, errors }));
await browser.close();
