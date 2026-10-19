import Link from "next/link";
import { countInquiriesByStatus, dbPath, listInquiries, recentAudit, getConfig } from "@/lib/db.js";
import { ensureAdminSeed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "新建",
  in_progress: "处理中",
  replied: "已回复",
  closed: "已关闭",
};

export default async function AdminHome() {
  const counts = countInquiriesByStatus();
  const recent = listInquiries({ limit: 8 });
  const audit = recentAudit(8);
  const config = getConfig();
  const seed = ensureAdminSeed();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">OVERVIEW</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            询价概览
          </h1>
        </div>
        <Link href="/admin/inquiries" className="btn btn--ghost btn--sm">
          全部询价 →
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { key: "new", label: STATUS_LABEL.new, value: counts.new },
          { key: "in_progress", label: STATUS_LABEL.in_progress, value: counts.in_progress },
          { key: "replied", label: STATUS_LABEL.replied, value: counts.replied },
          { key: "closed", label: STATUS_LABEL.closed, value: counts.closed },
        ].map((card) => (
          <div key={card.key} className="panel" style={{ padding: 18 }}>
            <p className="mono-sm">{card.label}</p>
            <p className="numeric" style={{ fontSize: 30, marginTop: 8, letterSpacing: "-0.02em" }}>
              {card.value}
            </p>
          </div>
        ))}
        <div className="panel" style={{ padding: 18, background: "#17191C", color: "#F6F7F8" }}>
          <p className="mono-sm" style={{ color: "rgba(246,247,248,.6)" }}>
            总计
          </p>
          <p className="numeric" style={{ fontSize: 30, marginTop: 8, letterSpacing: "-0.02em" }}>
            {counts.total}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="mono-sm">最近提交</p>
          <Link href="/admin/inquiries" className="small link-underline">
            查看全部
          </Link>
        </div>
        <div className="panel" style={{ marginTop: 10, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>编号</th>
                <th>时间</th>
                <th>公司 / 联系人</th>
                <th>型号数</th>
                <th>附件</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {recent.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--ink-3)", padding: 24 }}>
                    还没有询价记录。可以在前台提交一条测试需求验证闭环。
                  </td>
                </tr>
              ) : (
                recent.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/inquiries/${row.id}`} className="mono" style={{ color: "var(--ink)" }}>
                        {row.code}
                      </Link>
                    </td>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      {row.created_at.replace("T", " ").slice(0, 16)}
                    </td>
                    <td>
                      {row.company || row.contact_name || "—"}
                      <div className="mono" style={{ fontSize: 10.5 }}>
                        {row.email || row.phone}
                      </div>
                    </td>
                    <td>{row.item_count}</td>
                    <td>{row.attachment_count}</td>
                    <td>
                      <span className={`badge badge--${row.status === "new" ? "new" : row.status === "in_progress" ? "progress" : row.status === "replied" ? "replied" : "closed"}`}>
                        {STATUS_LABEL[row.status] || row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
        <div className="panel" style={{ padding: 20 }}>
          <p className="mono-sm">系统状态</p>
          <dl style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <dt style={{ color: "var(--ink-3)" }}>数据库</dt>
              <dd className="mono" style={{ fontSize: 11, wordBreak: "break-all", textAlign: "right" }}>
                {dbPath()}
              </dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <dt style={{ color: "var(--ink-3)" }}>附件目录</dt>
              <dd className="mono" style={{ fontSize: 11 }}>private/uploads（非公开）</dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <dt style={{ color: "var(--ink-3)" }}>销售通知</dt>
              <dd className="mono" style={{ fontSize: 11 }}>
                {config.notification?.webhook_url ? "已配置 webhook" : "未配置"}
              </dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <dt style={{ color: "var(--ink-3)" }}>初始账号</dt>
              <dd className="mono" style={{ fontSize: 11 }}>
                {seed.email || "已存在"}
              </dd>
            </div>
          </dl>
          {seed.usingDefaultPassword ? (
            <p className="small" style={{ marginTop: 12, color: "#8a6b3a" }}>
              当前使用默认初始密码，上线前必须通过环境变量 ADMIN_PASSWORD 重新部署或修改数据库中的密码哈希。
            </p>
          ) : null}
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <p className="mono-sm">操作日志</p>
          <ul style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {audit.length === 0 ? (
              <li className="small">暂无操作记录。</li>
            ) : (
              audit.map((row) => (
                <li key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12.5 }}>
                    {row.action} · {row.target}
                  </span>
                  <span className="mono" style={{ fontSize: 10.5 }}>
                    {row.created_at.replace("T", " ").slice(5, 16)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="panel" style={{ padding: 20, marginTop: 16, background: "rgba(138,107,58,.05)", borderColor: "rgba(138,107,58,.25)" }}>
        <p className="mono-sm" style={{ color: "#7a5d30" }}>演示数据提示</p>
        <p className="small" style={{ marginTop: 8, maxWidth: "90ch" }}>
          当前品牌、类目、服务、FAQ 与团队结构来自种子数据，其中团队人数、仓储面积、资质与联系方式均标记为待补。
          正式上线前请在「品牌与供货关系」核对实际关系，并替换公司资料，避免出现未确认的实力描述。
        </p>
      </div>
    </>
  );
}
