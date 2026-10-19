/**
 * 本地按 GitHub Pages 的路径规则预览静态产物：http://localhost:4320/chip-inquiry-site/
 * （Pages 项目页地址带一层 /<repo>/，直接开 out/index.html 看不出路径问题，必须按子路径验证）
 *
 * 用法：node scripts/serve-pages.mjs [port] [repo]
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.argv[2] || 4320);
const REPO = process.argv[3] || process.env.PAGE_REPO || "chip-inquiry-site";
const ROOT = path.join(process.cwd(), "out");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  let rel = decodeURIComponent(url.pathname);
  if (!rel.startsWith(`/${REPO}`)) {
    res.writeHead(302, { Location: `/${REPO}/` });
    res.end();
    return;
  }
  rel = rel.slice(REPO.length + 1);
  let file = path.join(ROOT, rel);
  if (rel === "" || rel.endsWith("/")) file = path.join(file, "index.html");
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) {
    const notFound = path.join(ROOT, "404.html");
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(existsSync(notFound) ? readFileSync(notFound) : "404");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`pages preview: http://localhost:${PORT}/${REPO}/`);
});
