import puppeteer from "puppeteer-core";
const sets = [
  ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  ["--enable-unsafe-swiftshader"],
  ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  ["--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader"],
];
for (const args of sets) {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox", ...args] });
  const p = await b.newPage();
  const r = await p.evaluate(() => {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return { ok: false };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return { ok: true, renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "n/a" };
  });
  console.log(JSON.stringify({ args, r }));
  await b.close();
}
