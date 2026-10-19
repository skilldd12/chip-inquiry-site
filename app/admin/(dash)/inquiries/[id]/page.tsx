import Link from "next/link";
import { notFound } from "next/navigation";
import { getInquiry } from "@/lib/db.js";
import { StatusPanel } from "@/components/admin/status-panel";

export const dynamic = "force-dynamic";

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getInquiry(Number(id));
  if (!record) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/inquiries" className="mono-sm">
            ← 返回列表
          </Link>
          <h1 className="mono" style={{ fontSize: 24, marginTop: 10, letterSpacing: "0.02em" }}>
            {record.code}
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            {record.created_at.replace("T", " ").slice(0, 19)} · {record.locale.toUpperCase()} ·{" "}
            {record.kind === "contact" ? "联系表单留言" : "询价"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {record.attachments.length > 0 ? (
            <a
              className="btn btn--ghost btn--sm"
              href={`/api/admin/attachments/${record.attachments[0].id}`}
            >
              下载首个附件
            </a>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel" style={{ padding: 20 }}>
            <p className="mono-sm">联系人</p>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 14,
                marginTop: 12,
                fontSize: 13.5,
              }}
            >
              {[
                ["公司", record.company],
                ["称呼", record.contact_name],
                ["邮箱", record.email],
                ["电话", record.phone],
                ["国家/地区", record.country],
                ["语言", record.locale],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="mono-sm">{label}</dt>
                  <dd style={{ marginTop: 4 }}>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <p className="mono-sm">型号需求（{record.items.length}）</p>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>MPN</th>
                  <th>品牌</th>
                  <th>数量</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {record.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--ink-3)" }}>
                      无型号行（联系表单留言）。
                    </td>
                  </tr>
                ) : (
                  record.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="mono">{String(index + 1).padStart(2, "0")}</td>
                      <td className="mono" style={{ color: "var(--ink)" }}>{item.mpn}</td>
                      <td>{item.brand || "—"}</td>
                      <td className="numeric">{item.qty ?? "—"}</td>
                      <td className="small">{item.note || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {record.message ? (
            <div className="panel" style={{ padding: 20 }}>
              <p className="mono-sm">需求说明</p>
              <p style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>
                {record.message}
              </p>
            </div>
          ) : null}

          <div className="panel" style={{ padding: 20 }}>
            <p className="mono-sm">附件（{record.attachments.length}）</p>
            {record.attachments.length === 0 ? (
              <p className="small" style={{ marginTop: 10 }}>没有附件。</p>
            ) : (
              <ul style={{ marginTop: 10 }}>
                {record.attachments.map((file) => (
                  <li
                    key={file.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--line)",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{file.original_name}</span>
                    <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 10.5 }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <a className="btn btn--ghost btn--sm" href={`/api/admin/attachments/${file.id}`}>
                        下载
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint" style={{ marginTop: 12 }}>
              附件位于私有目录，下载链接需要登录态；未登录访问会返回 401。
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <StatusPanel id={record.id} status={record.status} note={record.internal_note} />

          <div className="panel" style={{ padding: 20 }}>
            <p className="mono-sm">通知</p>
            <p style={{ fontSize: 13, marginTop: 10 }}>
              {record.notification_status === "sent"
                ? "已由通知端点接收"
                : record.notification_status === "failed"
                  ? "发送失败（记录仍已保存）"
                  : record.notification_status === "not_configured"
                    ? "未配置通知端点"
                    : "待处理"}
            </p>
            {record.notification_detail ? (
              <p className="hint" style={{ marginTop: 6 }}>
                {record.notification_detail}
              </p>
            ) : null}
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <p className="mono-sm">技术信息</p>
            <dl style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 12 }}>
              <div>
                <dt className="mono-sm">IP 哈希</dt>
                <dd className="mono" style={{ fontSize: 10.5, wordBreak: "break-all" }}>{record.ip_hash || "—"}</dd>
              </div>
              <div>
                <dt className="mono-sm">User agent</dt>
                <dd className="mono" style={{ fontSize: 10.5, wordBreak: "break-word" }}>
                  {record.user_agent || "—"}
                </dd>
              </div>
              <div>
                <dt className="mono-sm">更新于</dt>
                <dd className="mono" style={{ fontSize: 10.5 }}>{record.updated_at.slice(0, 19).replace("T", " ")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
