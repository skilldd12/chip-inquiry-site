"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? "尝试次数过多，请稍后再试。" : "邮箱或密码不正确。");
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("网络错误，请重试。");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
      <p className="mono-sm">AXIOM / ADMIN</p>
      <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 14 }}>
        询价后台登录
      </h1>
      <p className="small" style={{ marginTop: 8 }}>
        该入口仅限内部人员使用，页面不参与搜索引擎索引。
      </p>

      <div style={{ display: "grid", gap: 14, marginTop: 26 }}>
        <div className="field">
          <label className="label" htmlFor="admin-email">
            邮箱
          </label>
          <input
            id="admin-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="admin-password">
            密码
          </label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {error ? (
        <p className="field-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn--primary"
        style={{ width: "100%", marginTop: 20 }}
        disabled={busy}
      >
        {busy ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
