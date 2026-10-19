"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "概览" },
  { href: "/admin/inquiries", label: "询价记录" },
  { href: "/admin/brands", label: "品牌与供货关系" },
  { href: "/admin/catalog", label: "类目 / 服务 / FAQ" },
  { href: "/admin/editorial", label: "图片与页面内容" },
  { href: "/admin/content", label: "公司资料与通知" },
  { href: "/admin/seo", label: "SEO 与翻译覆盖" },
  { href: "/admin/import", label: "Excel / CSV 导入" },
];

export function AdminNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <nav style={{ display: "grid", gap: 2 }}>
      {LINKS.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className="admin-link" data-active={active}>
            <span>{link.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className="admin-link"
        onClick={logout}
        disabled={busy}
        style={{ textAlign: "left", background: "none", border: 0, cursor: "pointer" }}
      >
        <span>{busy ? "退出中…" : "退出登录"}</span>
      </button>
    </nav>
  );
}
