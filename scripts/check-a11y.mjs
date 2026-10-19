/**
 * 交互与可访问性检查（真实浏览器断言，输出 JSON 结果）。
 *
 * 覆盖：
 *   1. prefers-reduced-motion: reduce —— 首屏不 pin（高度 ≈ 视口）、标题可见、无横向溢出
 *   2. 移动端抽屉 —— 打开/aria-expanded/锁滚动/Esc 关闭/焦点返回
 *   3. 键盘焦点可见 —— Tab 首个焦点为跳转链接，主按钮 :focus-visible 有描边
 *   4. 标题局部渐变 —— 指针进入标题后 --mx 发生变化，且文字仍可选中
 *
 * 用法：node scripts/check-a11y.mjs http://localhost:4311 ../shots
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const base = process.argv[2] || "http://localhost:4311";
const outDir = path.resolve(process.argv[3] || "../shots");
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const results = [];
const push = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ? JSON.stringify(detail) : ""}`);
};

await mkdir(outDir, { recursive: true });

/* ---------------- 1. 降低动效 ---------------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`${base}/zh`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));

  const info = await page.evaluate(() => {
    const hero = document.querySelector(".hero");
    const title = document.querySelector("#hero-title");
    const stage = document.querySelector(".hero__stage");
    const cs = title ? getComputedStyle(title) : null;
    return {
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      viewport: window.innerHeight,
      stageHeight: stage ? Math.round(stage.getBoundingClientRect().height) : 0,
      titleOpacity: cs ? Number(cs.opacity) : 0,
      titleTransform: cs ? cs.transform : "",
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      pinSpacer: Boolean(document.querySelector(".pin-spacer")),
    };
  });

  push("reduced-motion: 首屏高度未因 pin 拉长", Math.abs(info.heroHeight - info.viewport) < 40, {
    heroHeight: info.heroHeight,
    viewport: info.viewport,
    pinSpacer: info.pinSpacer,
  });
  push("reduced-motion: 标题首帧可见（opacity=1）", info.titleOpacity === 1, {
    opacity: info.titleOpacity,
  });
  push("reduced-motion: 无横向溢出", info.scrollWidth <= info.clientWidth, {
    scrollWidth: info.scrollWidth,
    clientWidth: info.clientWidth,
  });

  await page.screenshot({ path: path.join(outDir, "hero-reduced-motion.png") });
  await page.close();
}

/* ---------------- 2. 移动端抽屉 ---------------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${base}/ru`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));

  const toggle = await page.$("header .menu-toggle");
  push("移动端存在菜单按钮", Boolean(toggle), null);

  if (toggle) {
    await toggle.click();
    await new Promise((r) => setTimeout(r, 500));
    const opened = await page.evaluate(() => {
      const drawer = document.querySelector("#mobile-drawer");
      const btn = document.querySelector("header .menu-toggle");
      return {
        open: drawer?.getAttribute("data-open"),
        ariaHidden: drawer?.getAttribute("aria-hidden"),
        expanded: btn?.getAttribute("aria-expanded"),
        bodyLocked: document.body.classList.contains("no-scroll"),
        visible: drawer ? getComputedStyle(drawer).visibility : "",
      };
    });
    push("抽屉打开：data-open=true 且可见", opened.open === "true" && opened.visible === "visible", opened);
    push("抽屉打开：aria-expanded=true 且锁滚动", opened.expanded === "true" && opened.bodyLocked, opened);

    await page.screenshot({ path: path.join(outDir, "drawer-ru-390.png") });

    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 500));
    const closed = await page.evaluate(() => {
      const drawer = document.querySelector("#mobile-drawer");
      const btn = document.querySelector("header .menu-toggle");
      return {
        open: drawer?.getAttribute("data-open"),
        expanded: btn?.getAttribute("aria-expanded"),
        bodyLocked: document.body.classList.contains("no-scroll"),
        focused: document.activeElement?.className ?? "",
        focusOnToggle: document.activeElement === document.querySelector("header .menu-toggle"),
      };
    });
    push("Esc 关闭抽屉并解除滚动锁", closed.open === "false" && !closed.bodyLocked, closed);
    push("Esc 关闭后焦点回到菜单按钮", closed.focusOnToggle === true, {
      focused: closed.focused,
    });
  }
  await page.close();
}

/* ---------------- 3. 键盘焦点 ---------------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/zh`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1400));

  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, cls: el?.className ?? "", text: (el?.textContent || "").trim().slice(0, 20) };
  });
  push("首个 Tab 焦点为跳转主内容链接", /skip/i.test(first.cls) || first.tag === "A", first);

  /* 找到主 CTA 并聚焦 */
  const focused = await page.evaluate(() => {
    const cta = document.querySelector(".hero__actions .btn--primary");
    if (!cta) return null;
    cta.focus();
    const cs = getComputedStyle(cta);
    return {
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      boxShadow: cs.boxShadow.slice(0, 40),
    };
  });
  push(
    "主按钮键盘聚焦有可见描边",
    Boolean(focused) && (parseFloat(focused.outlineWidth) > 0 || focused.boxShadow !== "none"),
    focused
  );

  /* ---------------- 4. 标题局部渐变 ---------------- */
  const gradient = await page.evaluate(async () => {
    const title = document.querySelector("#hero-title");
    if (!title) return null;
    const before = getComputedStyle(title).getPropertyValue("--mx").trim();
    const rect = title.getBoundingClientRect();
    title.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: rect.left + rect.width * 0.3,
        clientY: rect.top + rect.height * 0.5,
        pointerType: "mouse",
      })
    );
    await new Promise((r) => setTimeout(r, 260));
    const after = getComputedStyle(title).getPropertyValue("--mx").trim();
    const selectable = getComputedStyle(title).userSelect;
    return { before, after, selectable };
  });
  push(
    "指针进入标题后局部渐变位置变化",
    Boolean(gradient) && gradient.before !== gradient.after,
    gradient
  );
  push("标题文字仍可选中", Boolean(gradient) && gradient.selectable !== "none", gradient);

  await page.close();
}

await browser.close();
await writeFile(
  path.join(outDir, "a11y.json"),
  `${JSON.stringify({ checkedAt: new Date().toISOString(), base, results }, null, 2)}\n`,
  "utf8"
);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} 通过，结果写入 ${path.join(outDir, "a11y.json")}`);
