import { listAllBrands } from "@/lib/db.js";
import { COLLECTIONS } from "@/lib/admin-schema";
import { CollectionEditor } from "@/components/admin/collection-editor";

export const dynamic = "force-dynamic";

export default async function AdminBrands() {
  const brands = listAllBrands();
  const publicCount = brands.filter((b) => Number(b.is_public) === 1).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">BRANDS</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            品牌与供货关系
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            共 {brands.length} 个品牌，其中 {publicCount} 个前台公开。
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{
          padding: 18,
          marginBottom: 20,
          background: "rgba(138,107,58,.05)",
          borderColor: "rgba(138,107,58,.25)",
        }}
      >
        <p className="mono-sm" style={{ color: "#7a5d30" }}>合规提示</p>
        <p className="small" style={{ marginTop: 8, maxWidth: "95ch" }}>
          前台不读取 supply_relation 与 internal_note。请仅在确有关系文件时把状态改为「已确认供货」；
          默认的「可寻源」只表示可以接受询价。品牌标志应上传官方 SVG，不用 AI 重绘的商标。
        </p>
      </div>

      <CollectionEditor collection={COLLECTIONS.brands} rows={brands as Record<string, unknown>[]} />
    </>
  );
}
