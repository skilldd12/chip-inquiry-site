import Link from "next/link";
import { listInquiries, INQUIRY_STATUSES } from "@/lib/db.js";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  new: "新建",
  in_progress: "处理中",
  replied: "已回复",
  closed: "已关闭",
};

const CLASS: Record<string, string> = {
  new: "badge--new",
  in_progress: "badge--progress",
  replied: "badge--replied",
  closed: "badge--closed",
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page } = await searchParams;
  const pageSize = 30;
  const current = Math.max(1, Number(page) || 1);
  const result = listInquiries({
    status: status && INQUIRY_STATUSES.includes(status) ? status : undefined,
    q: q?.trim() || undefined,
    limit: pageSize,
    offset: (current - 1) * pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">INQUIRIES</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            询价记录
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            共 {result.total} 条。状态变更与备注会写入操作日志。
          </p>
        </div>
        <a href={`/api/admin/export?${query.toString()}`} className="btn btn--ghost btn--sm">
          导出 CSV
        </a>
      </div>

      <form
        method="get"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: 18,
        }}
      >
        <div className="field" style={{ minWidth: 200 }}>
          <label className="label" htmlFor="q">
            搜索
          </label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q || ""}
            placeholder="编号 / 公司 / 邮箱 / 型号"
          />
        </div>
        <div className="field" style={{ minWidth: 150 }}>
          <label className="label" htmlFor="status">
            状态
          </label>
          <select id="status" name="status" className="select" defaultValue={status || ""}>
            <option value="">全部</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          筛选
        </button>
        {status || q ? (
          <Link href="/admin/inquiries" className="btn btn--ghost btn--sm">
            清除
          </Link>
        ) : null}
      </form>

      <div className="panel" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>编号</th>
              <th>提交时间</th>
              <th>类型</th>
              <th>公司 / 联系人</th>
              <th>联系方式</th>
              <th>型号</th>
              <th>附件</th>
              <th>通知</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 26, color: "var(--ink-3)" }}>
                  没有符合条件的记录。
                </td>
              </tr>
            ) : (
              result.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/inquiries/${row.id}`} className="mono" style={{ color: "var(--ink)" }}>
                      {row.code}
                    </Link>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {row.created_at.replace("T", " ").slice(0, 16)}
                  </td>
                  <td>
                    <span className="badge">{row.kind === "contact" ? "留言" : "询价"}</span>
                  </td>
                  <td>{row.company || "—"}{row.contact_name ? ` / ${row.contact_name}` : ""}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{row.email || row.phone || "—"}</td>
                  <td>{row.item_count}</td>
                  <td>{row.attachment_count}</td>
                  <td className="mono" style={{ fontSize: 10.5 }}>
                    {row.notification_status === "sent"
                      ? "已发送"
                      : row.notification_status === "failed"
                        ? "失败"
                        : row.notification_status === "not_configured"
                          ? "未配置"
                          : "待处理"}
                  </td>
                  <td>
                    <span className={`badge ${CLASS[row.status] || ""}`}>{LABEL[row.status] || row.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          {current > 1 ? (
            <Link
              className="btn btn--ghost btn--sm"
              href={`/admin/inquiries?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(current - 1) }).toString()}`}
            >
              上一页
            </Link>
          ) : null}
          <span className="mono" style={{ fontSize: 11 }}>
            {current} / {totalPages}
          </span>
          {current < totalPages ? (
            <Link
              className="btn btn--ghost btn--sm"
              href={`/admin/inquiries?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(current + 1) }).toString()}`}
            >
              下一页
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
