"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Collection, Field } from "@/lib/admin-schema";

type Row = Record<string, unknown>;

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className="badge" style={tone ? { borderColor: tone, color: tone } : undefined}>{children}</span>;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label
        style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, paddingTop: 6 }}
      >
        <input
          type="checkbox"
          checked={Boolean(Number(value) || value === true)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "#17191C" }}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        <label className="label" htmlFor={`f-${field.key}`}>
          {field.label}
        </label>
        <select
          id={`f-${field.key}`}
          className="select"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="field">
        <label className="label" htmlFor={`f-${field.key}`}>
          {field.label}
        </label>
        <textarea
          id={`f-${field.key}`}
          className="textarea"
          style={{ minHeight: 76 }}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="field">
      <label className="label" htmlFor={`f-${field.key}`}>
        {field.label}
      </label>
      <input
        id={`f-${field.key}`}
        className="input"
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      />
      {field.hint ? <p className="hint">{field.hint}</p> : null}
    </div>
  );
}

function RowEditor({
  collection,
  row,
  onDone,
}: {
  collection: Collection;
  row: Row;
  onDone: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Row>(() => ({ ...row }));
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const isNew = !row.id && !collection.compositeKey;

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/admin/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ table: collection.table, id: row.id, values }),
      });
      if (!res.ok) throw new Error("failed");
      setState("idle");
      router.refresh();
      onDone();
    } catch {
      setState("error");
    }
  };

  const remove = async () => {
    if (!window.confirm("确认删除这条记录？该操作不可撤销。")) return;
    setState("saving");
    try {
      const res = await fetch("/api/admin/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          table: collection.table,
          id: row.id,
          action: "delete",
          values,
        }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
      onDone();
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{ padding: "4px 0 18px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {collection.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={save}
          disabled={state === "saving"}
        >
          {state === "saving" ? "保存中…" : isNew ? "创建" : "保存"}
        </button>
        {!isNew ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={remove}>
            删除
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDone}>
          取消
        </button>
        {state === "error" ? <span className="field-error">保存失败</span> : null}
      </div>
    </div>
  );
}

export function CollectionEditor({
  collection,
  rows,
}: {
  collection: Collection;
  rows: Row[];
}) {
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [creating, setCreating] = useState(false);

  const keyOf = (row: Row) =>
    collection.compositeKey
      ? collection.compositeKey.map((k) => String(row[k] ?? "")).join("|")
      : Number(row.id);

  return (
    <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 500 }}>{collection.title}</h2>
          <p className="small" style={{ marginTop: 6, maxWidth: "80ch" }}>
            {collection.description}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setCreating((v) => !v);
            setOpenId(null);
          }}
        >
          {creating ? "关闭" : "新增"}
        </button>
      </div>

      {creating ? (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <RowEditor collection={collection} row={{}} onDone={() => setCreating(false)} />
        </div>
      ) : null}

      <div style={{ marginTop: 16, borderTop: "1px solid var(--line)" }}>
        {rows.map((row) => {
          const id = keyOf(row);
          const isOpen = openId === id;
          const label = String(row[collection.labelField] ?? "—");
          return (
            <div key={String(id)} style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : id)}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13.5,
                    flex: 1,
                  }}
                >
                  {label.length > 60 ? `${label.slice(0, 60)}…` : label}
                  {collection.secondaryFields?.length ? (
                    <span style={{ marginLeft: 10 }}>
                      {collection.secondaryFields.map((f) => (
                        <Badge key={f}>{String(row[f] ?? "—")}</Badge>
                      ))}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setOpenId(isOpen ? null : id)}
                >
                  {isOpen ? "收起" : "编辑"}
                </button>
              </div>
              {isOpen ? (
                <RowEditor collection={collection} row={row} onDone={() => setOpenId(null)} />
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        共 {rows.length} 条。保存后前台会在下次请求时读取新内容。
      </p>
    </section>
  );
}
