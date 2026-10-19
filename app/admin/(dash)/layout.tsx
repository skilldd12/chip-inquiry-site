import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div style={{ padding: "4px 10px 18px" }}>
          <p className="mono-sm">AXIOM / ADMIN</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>{session.email}</p>
        </div>
        <AdminNav />
        <div style={{ padding: "18px 10px 0" }}>
          <Link href="/zh" className="admin-link" style={{ fontSize: 12 }}>
            查看前台 ↗
          </Link>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
