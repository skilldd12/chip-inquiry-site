import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="container" style={{ paddingTop: "calc(var(--header-h) + 120px)", paddingBottom: 140 }}>
      <p className="mono-sm">404</p>
      <h1 className="display display--cn" style={{ marginTop: 16, fontSize: "clamp(34px,5vw,64px)" }}>
        页面不存在 / Page not found
      </h1>
      <p className="body" style={{ marginTop: 18, maxWidth: "52ch" }}>
        链接可能已更新或输入有误。可以从首页重新进入，或直接提交询价。
      </p>
      <div className="flex gap-3" style={{ marginTop: 26 }}>
        <Link href="/zh" className="btn btn--primary">
          返回首页
        </Link>
        <Link href="/en/inquiry" className="btn btn--ghost">
          Request a quote
        </Link>
      </div>
    </div>
  );
}
