"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  { value: "new", label: "新建" },
  { value: "in_progress", label: "处理中" },
  { value: "replied", label: "已回复" },
  { value: "closed", label: "已关闭" },
];

export function StatusPanel({
  id,
  status,
  note,
}: {
  id: number;
  status: string;
  note: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [text, setText] = useState(note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: value, internalNote: text }),
      });
      if (!res.ok) throw new Error("failed");
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  return (
    <div className="panel" style={{ padding: 20 }}>
      <p className="mono-sm">处理</p>
      <div className="field" style={{ marginTop: 12 }}>
        <label className="label" htmlFor="status-select">
          状态
        </label>
        <select
          id="status-select"
          className="select"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label className="label" htmlFor="internal-note">
          内部备注（不对外）
        </label>
        <textarea
          id="internal-note"
          className="textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setState("idle");
          }}
          placeholder="渠道、批次、报价要点、跟进结果"
        />
      </div>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        style={{ marginTop: 12, width: "100%" }}
        onClick={save}
        disabled={state === "saving"}
      >
        {state === "saving" ? "保存中…" : "保存"}
      </button>
      {state === "saved" ? <p className="small" style={{ marginTop: 8, color: "#2f6a4a" }}>已保存</p> : null}
      {state === "error" ? <p className="field-error" style={{ marginTop: 8 }}>保存失败，请重试</p> : null}
    </div>
  );
}
