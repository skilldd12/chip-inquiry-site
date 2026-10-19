"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SiteConfig } from "@/lib/site";

const TEXT_FIELDS: { key: keyof SiteConfig["company"]; label: string }[] = [
  { key: "name_zh", label: "中文名称" },
  { key: "name_en", label: "英文名称" },
  { key: "legal_name", label: "法定主体名称" },
  { key: "short_zh", label: "中文简称（页脚）" },
  { key: "short_en", label: "英文简称（页脚）" },
  { key: "founded", label: "成立年份" },
  { key: "email", label: "邮箱" },
  { key: "phone", label: "电话" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "wechat", label: "微信" },
  { key: "address_zh", label: "地址（中）" },
  { key: "address_en", label: "地址（英）" },
  { key: "address_ru", label: "地址（俄）" },
  { key: "hours_zh", label: "工作时间（中）" },
  { key: "hours_en", label: "工作时间（英）" },
  { key: "hours_ru", label: "工作时间（俄）" },
];

export function ConfigForm({ config }: { config: SiteConfig }) {
  const router = useRouter();
  const [company, setCompany] = useState({ ...config.company });
  const [notification, setNotification] = useState({ ...config.notification });
  const [hero, setHero] = useState({ ...config.hero });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company, notification, hero, media: config.media, legal: config.legal }),
      });
      if (!res.ok) throw new Error("failed");
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section className="panel" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 500 }}>公司资料与联系方式</h2>
        <p className="small" style={{ marginTop: 6 }}>
          留空即在前台显示“待补”。电话与邮箱未填写时，前台不会生成可点击链接。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {TEXT_FIELDS.map((field) => (
            <div className="field" key={field.key}>
              <label className="label" htmlFor={`cfg-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`cfg-${field.key}`}
                className="input"
                value={String(company[field.key] ?? "")}
                onChange={(e) => setCompany({ ...company, [field.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={Boolean(company.pending_note)}
            onChange={(e) => setCompany({ ...company, pending_note: e.target.checked })}
            style={{ accentColor: "#17191C" }}
          />
          前台显示“资料待补”提示
        </label>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 500 }}>销售通知</h2>
        <p className="small" style={{ marginTop: 6, maxWidth: "80ch" }}>
          只有 webhook 端点返回 2xx 才记为“已发送”。未配置时记录仍会保存，后台显示“未配置”，不会声称邮件已发出。
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div className="field">
            <label className="label" htmlFor="notify-sales">
              销售邮箱（记录用途）
            </label>
            <input
              id="notify-sales"
              className="input"
              value={notification.sales_email}
              onChange={(e) => setNotification({ ...notification, sales_email: e.target.value })}
              placeholder="sales@example.com"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="notify-webhook">
              通知 Webhook URL
            </label>
            <input
              id="notify-webhook"
              className="input"
              value={notification.webhook_url}
              onChange={(e) => setNotification({ ...notification, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={Boolean(notification.enabled)}
              onChange={(e) => setNotification({ ...notification, enabled: e.target.checked })}
              style={{ accentColor: "#17191C" }}
            />
            启用通知
          </label>
        </div>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 500 }}>首屏素材路径</h2>
        <p className="small" style={{ marginTop: 6 }}>
          当前为 AI 预渲染原型素材。替换为实拍或三维渲染时，保持同名覆盖即可；素材必须放在 /public/images。
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {(["image_01", "image_02", "image_03"] as const).map((key, index) => (
            <div className="field" key={key}>
              <label className="label" htmlFor={`hero-${key}`}>
                状态 {index + 1} 图片路径
              </label>
              <input
                id={`hero-${key}`}
                className="input"
                value={hero[key]}
                onChange={(e) => setHero({ ...hero, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "保存中…" : "保存全部设置"}
        </button>
        {state === "saved" ? <span className="small" style={{ color: "#2f6a4a" }}>已保存</span> : null}
        {state === "error" ? <span className="field-error">保存失败</span> : null}
      </div>
    </div>
  );
}
