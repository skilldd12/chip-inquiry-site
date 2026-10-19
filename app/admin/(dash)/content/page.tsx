import { ConfigForm } from "@/components/admin/config-form";
import { getSiteData } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const { config } = getSiteData();
  const company = config.company;

  const pending = [
    { label: "法定主体名称", done: Boolean(company.legal_name) },
    { label: "公司邮箱", done: Boolean(company.email) },
    { label: "联系电话", done: Boolean(company.phone) },
    { label: "中文地址", done: Boolean(company.address_zh) },
    { label: "英文地址", done: Boolean(company.address_en) },
    { label: "成立年份", done: Boolean(company.founded) },
    { label: "销售通知 webhook", done: Boolean(config.notification.webhook_url) },
  ];
  const missing = pending.filter((item) => !item.done).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">SITE CONFIG</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            公司资料与通知
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            还有 {missing} 项上线前待补。未填写的公司资料不会在前台展示，也不会用示例数据顶替。
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
        <p className="mono-sm">上线前核对</p>
        <ul style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {pending.map((item) => (
            <li key={item.label} style={{ display: "flex", gap: 10, fontSize: 13 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  border: "1px solid var(--line-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: item.done ? "#2f6a4a" : "var(--ink-3)",
                  marginTop: 3,
                }}
              >
                {item.done ? "✓" : ""}
              </span>
              <span style={{ color: item.done ? "var(--ink-2)" : "#7a5d30" }}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <ConfigForm config={config} />
    </>
  );
}
