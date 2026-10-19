import type { ReactNode } from "react";

export function PageHead({
  eyebrow,
  title,
  lead,
  aside,
  tone = "display",
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
  tone?: "display" | "h2";
}) {
  return (
    <header className="page-head">
      <div className="container">
        <div className="grid12" style={{ alignItems: "end" }}>
          <div className="g-7">
            <p className="eyebrow">{eyebrow}</p>
            <h1
              className={tone === "display" ? "display display--cn" : "h2 h2--cn"}
              style={{ marginTop: 18 }}
            >
              {title}
            </h1>
          </div>
          <div className="g-start-9" style={{ paddingBottom: 6 }}>
            {lead ? <p className="body">{lead}</p> : null}
            {aside}
          </div>
        </div>
        <div className="rule" style={{ marginTop: "clamp(28px, 4vw, 56px)" }} />
      </div>
    </header>
  );
}
