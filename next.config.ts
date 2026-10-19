import type { NextConfig } from "next";

/**
 * 同一份源码产出两种东西：
 *  - 默认 `next build`：完整 Node 服务，含 /api 询价接口与 /admin 后台，询价会落库。
 *  - `npm run build:pages`（STATIC_EXPORT=1）：导出静态站点到 out/，用于 GitHub Pages。
 *    静态产物没有服务端，询价表单会明确说明「不连接服务器」，不会假装提交成功。
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? process.env.STATIC_BASE_PATH || "" : "";

const nextConfig: NextConfig = {
  // Native/experimental modules must stay outside the bundler.
  serverExternalPackages: [],
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
      }
    : {
        images: {
          // All imagery is served locally; no remote loader is allowed in production.
          remotePatterns: [],
          formats: ["image/avif", "image/webp"] as ["image/avif", "image/webp"],
        },
      }),
  async redirects() {
    // 静态导出不支持 redirects；GitHub Pages 上由 app/page.tsx 负责跳转
    if (isStatic) return [];
    return [{ source: "/", destination: "/zh", permanent: false }];
  },
  async headers() {
    // 静态导出不支持 headers；安全头由托管方决定
    if (isStatic) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
