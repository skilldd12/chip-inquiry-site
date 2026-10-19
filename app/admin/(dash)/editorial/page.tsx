import { EditorialEditor } from "@/components/admin/editorial-editor";
import { getConfig, listCategories, listPublicBrands } from "@/lib/db.js";
import { parseEditorialConfig } from "@/lib/editorial-config";

export const dynamic = "force-dynamic";

export default function AdminEditorial() {
  // Pass only the editorial namespace and public catalogue fields to the browser.
  const editorial = parseEditorialConfig(getConfig().editorial);
  const brands = listPublicBrands().map(({ slug, name }) => ({ slug: String(slug), name: String(name) }));
  const categories = listCategories().map(({ slug, name_zh }) => ({ slug: String(slug), name: String(name_zh) }));
  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">IMAGES & PAGE CONTENT</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>图片与页面内容</h1>
          <p className="small" style={{ marginTop: 6, maxWidth: "80ch" }}>维护图片、三语文案与品牌 / 类目关联。品牌资料、类目与服务正文继续在原有栏目维护。</p>
        </div>
      </div>
      <EditorialEditor initial={editorial} brands={brands} categories={categories} />
    </>
  );
}
