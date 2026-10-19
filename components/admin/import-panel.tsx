"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = {
  rowNumber: number;
  action: string;
  errors: string[];
  changes: string[];
  values: Record<string, string>;
};

type Preview = {
  token: string;
  filename: string;
  headers: string[];
  mapping: Record<string, string>;
  summary: Record<string, number>;
  rowCount: number;
  rows: PreviewRow[];
};

const FIELDS = [
  { key: "external_id", label: "外部 ID" },
  { key: "mpn", label: "型号 MPN" },
  { key: "brand", label: "品牌" },
  { key: "package", label: "封装" },
  { key: "category", label: "类目" },
  { key: "description", label: "描述" },
  { key: "moq", label: "MOQ" },
];

const ACTION_LABEL: Record<string, string> = {
  create: "新增",
  update: "更新",
  skip: "无变化",
  conflict: "冲突（更新模式下覆盖）",
  error: "错误",
};

export function ImportPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"create_only" | "update">("create_only");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"idle" | "parsing" | "executing">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<
    | null
    | {
        created: number;
        updated: number;
        skipped: number;
        failed: number;
        errors: { rowNumber: number; errors: string[] }[];
        errorsUrl: string | null;
      }
  >(null);

  const parse = async (target: File, nextMapping?: Record<string, string>) => {
    setBusy("parsing");
    setMessage("");
    setResult(null);
    const body = new FormData();
    body.append("file", target, target.name);
    if (nextMapping) body.append("mapping", JSON.stringify(nextMapping));
    try {
      const res = await fetch("/api/admin/import/preview", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.message || "解析失败");
        setPreview(null);
        return;
      }
      setPreview(data);
      setMapping(data.mapping || {});
    } catch {
      setMessage("网络错误，解析失败");
    } finally {
      setBusy("idle");
    }
  };

  const onFile = (incoming: File | null) => {
    if (!incoming) return;
    setFile(incoming);
    setConfirm(false);
    void parse(incoming);
  };

  const execute = async () => {
    if (!preview || !confirm) return;
    setBusy("executing");
    setMessage("");
    try {
      const res = await fetch("/api/admin/import/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: preview.token, mode, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(
          data.message === "already_applied"
            ? "这一批已经导入过，请重新上传文件以免重复写入。"
            : "导入失败，请重新解析后再试。"
        );
        return;
      }
      setResult(data);
      setPreview(null);
      setFile(null);
      setConfirm(false);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setMessage("网络错误，导入未执行");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 500 }}>1. 上传表格</h2>
            <p className="small" style={{ marginTop: 6, maxWidth: "70ch" }}>
              支持 .xlsx 与 .csv，最多 2000 行、5MB。含公式的单元格不会被计算，该行会直接判定为错误。
            </p>
          </div>
          <a href="/api/admin/import/template" className="btn btn--ghost btn--sm">
            下载模板
          </a>
        </div>

        <div style={{ marginTop: 14 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
            className="input"
            style={{ paddingTop: 9 }}
          />
          {file ? (
            <p className="mono" style={{ marginTop: 8, fontSize: 11 }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          ) : null}
          {busy === "parsing" ? <p className="small">解析中…</p> : null}
          {message ? <p className="field-error">{message}</p> : null}
        </div>
      </section>

      {preview ? (
        <>
          <section className="panel" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 500 }}>2. 字段映射</h2>
            <p className="small" style={{ marginTop: 6 }}>
              系统按表头自动匹配，可手动调整。修改后点「重新解析」以新映射为准。
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              {FIELDS.map((field) => (
                <div className="field" key={field.key}>
                  <label className="label" htmlFor={`map-${field.key}`}>
                    {field.label}
                  </label>
                  <select
                    id={`map-${field.key}`}
                    className="select"
                    value={mapping[field.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="">未映射</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ marginTop: 14 }}
              onClick={() => file && parse(file, mapping)}
              disabled={busy === "parsing"}
            >
              重新解析
            </button>
          </section>

          <section className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 17, fontWeight: 500 }}>3. 逐行校验</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(preview.summary)
                  .filter(([key]) => key !== "total")
                  .map(([key, value]) => (
                    <span key={key} className="badge">
                      {ACTION_LABEL[key] || key}: {value}
                    </span>
                  ))}
                <span className="badge badge--new">共 {preview.rowCount} 行</span>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>行</th>
                    <th>判断</th>
                    <th>MPN</th>
                    <th>品牌</th>
                    <th>封装</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.values?.mpn || ""}`}>
                      <td className="mono">{row.rowNumber}</td>
                      <td>
                        <span className={`badge ${row.action === "error" ? "badge--progress" : ""}`}>
                          {ACTION_LABEL[row.action] || row.action}
                        </span>
                      </td>
                      <td className="mono">{row.values?.mpn || "—"}</td>
                      <td>{row.values?.brand || "—"}</td>
                      <td>{row.values?.package || "—"}</td>
                      <td className="small">
                        {row.errors.length ? row.errors.join(", ") : null}
                        {row.changes.length ? `变更字段: ${row.changes.join(", ")}` : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rowCount > preview.rows.length ? (
              <p className="hint" style={{ marginTop: 10 }}>
                仅展示前 {preview.rows.length} 行，执行时会处理全部 {preview.rowCount} 行。
              </p>
            ) : null}
          </section>

          <section className="panel" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 500 }}>4. 执行导入</h2>
            <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "create_only"}
                  onChange={() => setMode("create_only")}
                  style={{ accentColor: "#17191C" }}
                />
                仅新增（已存在的型号跳过）
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "update"}
                  onChange={() => setMode("update")}
                  style={{ accentColor: "#17191C" }}
                />
                新增并更新（按 preview 列出的变更字段覆盖）
              </label>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                style={{ marginTop: 3, accentColor: "#17191C" }}
              />
              我已核对预览，确认按当前映射与模式写入数据库。
            </label>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              style={{ marginTop: 14 }}
              onClick={execute}
              disabled={!confirm || busy === "executing"}
            >
              {busy === "executing" ? "写入中…" : "执行导入"}
            </button>
          </section>
        </>
      ) : null}

      {result ? (
        <section className="panel" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500 }}>导入结果</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <span className="badge badge--replied">新增 {result.created}</span>
            <span className="badge badge--new">更新 {result.updated}</span>
            <span className="badge">跳过 {result.skipped}</span>
            <span className="badge badge--progress">失败 {result.failed}</span>
          </div>
          {result.errors.length ? (
            <ul style={{ marginTop: 12 }}>
              {result.errors.map((row) => (
                <li key={row.rowNumber} className="small">
                  第 {row.rowNumber} 行：{row.errors.join(", ")}
                </li>
              ))}
            </ul>
          ) : null}
          {result.errorsUrl ? (
            <a href={result.errorsUrl} className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
              下载错误行
            </a>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
