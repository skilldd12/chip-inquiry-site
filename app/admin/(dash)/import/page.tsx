import { countParts, listImports } from "@/lib/db.js";
import { ImportPanel } from "@/components/admin/import-panel";

export const dynamic = "force-dynamic";

export default async function AdminImport() {
  const imports = listImports(12);
  const parts = countParts();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">IMPORT</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            Excel / CSV 导入
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            当前型号资料 {parts} 条。导入只写入型号资料，不会影响询价记录与站点内容。
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{ padding: 16, marginBottom: 18, background: "rgba(77,99,118,.05)", borderColor: "rgba(77,99,118,.22)" }}
      >
        <p className="mono-sm">去重规则</p>
        <p className="small" style={{ marginTop: 8, maxWidth: "92ch" }}>
          优先使用 external_id；没有 external_id 时按「品牌 + 规范化 MPN」匹配，匹配只用于判断是否存在，
          数据库保留原始 MPN 字符串（含前导零）。更新模式只覆盖预览中列出的变更字段，不静默覆盖其他内容。
        </p>
      </div>

      <ImportPanel />

      <section className="panel" style={{ padding: 20, marginTop: 18 }}>
        <p className="mono-sm">最近导入</p>
        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>时间</th>
              <th>文件</th>
              <th>模式</th>
              <th>新增</th>
              <th>更新</th>
              <th>跳过</th>
              <th>失败</th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: "var(--ink-3)" }}>
                  还没有导入记录。
                </td>
              </tr>
            ) : (
              imports.map((row) => (
                <tr key={row.id}>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {row.created_at.replace("T", " ").slice(0, 16)}
                  </td>
                  <td>{row.filename}</td>
                  <td>{row.mode === "update" ? "新增并更新" : "仅新增"}</td>
                  <td className="numeric">{row.created}</td>
                  <td className="numeric">{row.updated}</td>
                  <td className="numeric">{row.skipped}</td>
                  <td className="numeric">{row.failed}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
