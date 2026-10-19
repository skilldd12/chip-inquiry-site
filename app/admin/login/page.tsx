import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { ensureAdminSeed, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");
  const seed = ensureAdminSeed();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
      }}
    >
      <div style={{ padding: "clamp(28px, 5vw, 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoginForm />
      </div>
      <div
        style={{
          background: "#17191C",
          color: "#F6F7F8",
          padding: "clamp(28px, 5vw, 64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <p className="mono-sm" style={{ color: "rgba(246,247,248,.6)" }}>
          INQUIRY OPERATIONS
        </p>
        <div>
          <p style={{ fontSize: 28, lineHeight: 1.3, letterSpacing: "-0.02em", maxWidth: "22ch" }}>
            保存成功后才返回编号。通知失败不会让记录消失。
          </p>
          <p className="small" style={{ color: "rgba(246,247,248,.6)", marginTop: 16, maxWidth: "34ch" }}>
            后台仅展示真实记录：询价、附件、状态与内部备注。附件下载经过服务端权限检查。
          </p>
        </div>
        <p className="mono-sm" style={{ color: "rgba(246,247,248,.4)" }}>
          {seed.created ? "首次启动已创建初始账号，请立即修改密码" : "SESSION 8H · HTTPONLY COOKIE"}
        </p>
      </div>
    </div>
  );
}
