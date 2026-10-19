/**
 * 生成 GitHub Pages 用的静态站点（产物在 out/）。
 *
 * 为什么需要这个脚本而不是直接 `next build`：
 *  1) 静态导出不支持 /api 与 /admin（它们依赖 SQLite 与 cookies），构建前要把这两棵树临时移开，
 *     构建后原样移回——源码不做任何删改。
 *  2) GitHub Pages 的项目页地址带一层 /<repo>/，而 public 里的图片/视频是绝对路径（/images/…），
 *     Next 只会给 /_next/ 和 Link 自动加前缀，不会管这些字符串，所以构建后统一补前缀。
 *  3) Pages 默认跑 Jekyll，会吞掉 _next 目录，必须写 .nojekyll。
 *
 * 用法：node scripts/build-pages.mjs            （默认 repo=chip-inquiry-site）
 *       PAGE_REPO=xxx node scripts/build-pages.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPO = process.env.PAGE_REPO || "chip-inquiry-site";
const BASE_PATH = `/${REPO}`;
const SITE_URL = process.env.PAGE_SITE_URL || `https://skilldd12.github.io/${REPO}`;
const OUT = path.join(ROOT, "out");
const HOLD = path.join(ROOT, ".pages-hold");
/* 依赖 SQLite / cookies / 动态渲染的路由，静态产物里不存在 */
const SERVER_ONLY = ["admin", "api", "uploads"].map((name) => path.join(ROOT, "app", name));
/* robots / sitemap 在导出模式下会被判定为动态路由；静态站改成由导出结果反推生成 */
const SERVER_FILES = ["sitemap.ts", "robots.ts"].map((name) => path.join(ROOT, "app", name));

const moved = [];

function moveAside() {
  rmSync(HOLD, { recursive: true, force: true });
  mkdirSync(HOLD, { recursive: true });
  for (const dir of [...SERVER_ONLY, ...SERVER_FILES]) {
    if (!existsSync(dir)) continue;
    const target = path.join(HOLD, path.basename(dir));
    renameSync(dir, target);
    moved.push([target, dir]);
    console.log(`moved aside: app/${path.basename(dir)}`);
  }
}

function restore() {
  for (const [from, to] of moved) {
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    renameSync(from, to);
    console.log(`restored: app/${path.basename(to)}`);
  }
  rmSync(HOLD, { recursive: true, force: true });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * public 里的绝对路径资源补上项目前缀。
 * Next 只会给 /_next/ 和 <Link> 自动加 basePath，public 下的字符串路径它不管：
 *  - HTML / RSC payload 里是 `"/images/...`（双引号）
 *  - CSS 里是 `url(/images/...)`（无引号）——这一条最容易漏，漏了就 404
 *  - JS chunk 里可能藏着字符串字面量（品牌 logo 兜底路径）
 * 只替换「紧跟在引号/括号/等号/冒号/逗号之后」的裸路径，已经带前缀的不会被二次替换。
 */
const ASSET_ROOTS = ["/images/", "/video/", "/brands/", "/templates/", "/favicon.svg"];

function prefixAssets() {
  const targets = walk(OUT).filter((file) => /\.(html|txt|xml|json|css|js)$/.test(file));
  let touched = 0;
  let hits = 0;
  for (const file of targets) {
    const before = readFileSync(file, "utf8");
    let after = before;
    for (const root of ASSET_ROOTS) {
      const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      after = after.replace(new RegExp(`(^|[\\s"'(:=,])${escaped}`, "g"), (match, lead) => {
        hits += 1;
        return `${lead}${BASE_PATH}${root}`;
      });
    }
    if (after !== before) {
      writeFileSync(file, after);
      touched += 1;
    }
  }
  console.log(`assets prefixed: ${hits} refs in ${touched} files -> ${BASE_PATH}`);
}

const cleanEnv = { ...process.env };
delete cleanEnv.STATIC_EXPORT;

/* POST_ONLY=1：不重新 next build，只对现有 out/ 重跑后处理（补前缀 / 载荷 / sitemap）。
   调试后处理逻辑时省掉一遍全站构建。 */
const POST_ONLY = process.env.POST_ONLY === "1";

if (!POST_ONLY) {
  try {
    moveAside();
    rmSync(OUT, { recursive: true, force: true });
    // 上一次 dev 跑出来的 .next/dev/types 会引用已移走的 admin/api 路由，必须清掉再构建
    rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
    execSync("npx next build", {
      stdio: "inherit",
      env: {
        ...cleanEnv,
        STATIC_EXPORT: "1",
        STATIC_BASE_PATH: BASE_PATH,
        NEXT_PUBLIC_STATIC_EXPORT: "1",
        NEXT_PUBLIC_SITE_URL: SITE_URL,
        NODE_ENV: "production",
      },
    });
  } finally {
    restore();
  }
}

if (!existsSync(OUT)) {
  console.error("build finished but out/ is missing — check the build log above");
  process.exit(1);
}


/**
 * 静态导出把带动态段路由的 RSC 负载存成 `__next.$d$locale/xxx/__PAGE__.txt`（目录形式），
 * 而浏览器端路由请求的是 `__next.$d$locale.xxx.__PAGE__.txt`（点号形式）——这个映射原本由
 * Next 服务端的重写完成，静态托管没有服务端，于是每次客户端跳转都先吃一个 404 再退回整页刷新。
 * 这里按同样的规则把点号形式的副本一起生成，客户端导航就能走 SPA 模式。
 */
function flattenRscPayloads() {
  let created = 0;
  const dirs = walk(OUT).filter((file) => path.basename(file).startsWith("__next.") === false && false);
  void dirs;
  for (const file of walk(OUT)) {
    if (!file.endsWith(".txt")) continue;
    const rel = path.relative(OUT, file).split(path.sep);
    const marker = rel.findIndex((part) => part.startsWith("__next."));
    if (marker < 0) continue;
    const tail = rel.slice(marker + 1);
    if (!tail.length) continue;
    const flat = path.join(OUT, ...rel.slice(0, marker), `${rel[marker]}.${tail.join(".")}`);
    if (existsSync(flat)) continue;
    writeFileSync(flat, readFileSync(file));
    created += 1;
  }
  console.log(`rsc payloads flattened: ${created}`);
}

prefixAssets();
flattenRscPayloads();

/* 根路径落地页：静态导出没有 app/page.tsx（本项目根布局在 [locale] 里，根级页面会缺 layout），
   这里直接写一个极小的 HTML 做跳转，禁用 JS 时也能点进三种语言 */
writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=${BASE_PATH}/zh/">
<title>Loading · ${REPO}</title>
<link rel="canonical" href="${SITE_URL}/zh/">
<style>
  html,body{height:100%;margin:0;background:#f6f7f8;color:#17191c;
    font:14px/1.5 ui-sans-serif,system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
  main{height:100%;display:grid;place-items:center;text-align:center}
  a{color:inherit;margin:0 8px;text-decoration:underline;text-underline-offset:3px}
</style>
</head>
<body>
<main>
  <div>
    <p style="letter-spacing:.14em;font-size:11px;color:#5c6268;text-transform:uppercase">Entering</p>
    <p style="margin-top:14px"><a href="${BASE_PATH}/zh/">中文</a><a href="${BASE_PATH}/en/">EN</a><a href="${BASE_PATH}/ru/">RU</a></p>
  </div>
</main>
</body>
</html>
`
);
writeFileSync(path.join(OUT, ".nojekyll"), "");

/* 从导出结果反推 sitemap：凡是 out/<locale>/…/index.html 都算一页。
   404 与 _not-found 是错误页，不进 sitemap。 */
const pages = walk(OUT)
  .filter((file) => file.endsWith("index.html"))
  .map((file) => path.dirname(path.relative(OUT, file)).split(path.sep).join("/"))
  .filter((dir) => dir && dir !== ".")
  .filter((dir) => !/^(404|_not-found)(\/|$)/.test(dir))
  .sort();
const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .map((dir) => `  <url><loc>${SITE_URL}/${dir}/</loc><lastmod>${today}</lastmod></url>`)
  .join("\n");
writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
writeFileSync(
  path.join(OUT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);
console.log(`sitemap: ${pages.length} pages`);

const files = walk(OUT);
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`\nout/ ready: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`site url: ${SITE_URL}/`);
