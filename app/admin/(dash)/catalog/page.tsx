import {
  listAllFaqs,
  listCategories,
  listServices,
  listTeamRoles,
  listWarehouseItems,
} from "@/lib/db.js";
import { COLLECTIONS } from "@/lib/admin-schema";
import { CollectionEditor } from "@/components/admin/collection-editor";

export const dynamic = "force-dynamic";

export default async function AdminCatalog() {
  const [categories, services, faqs, team, warehouse] = [
    listCategories(),
    listServices(),
    listAllFaqs(),
    listTeamRoles(),
    listWarehouseItems(),
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">CONTENT LIBRARY</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            类目 / 服务 / FAQ / 团队 / 仓储
          </h1>
          <p className="small" style={{ marginTop: 6, maxWidth: "80ch" }}>
            中英俄三语字段并列维护。缺译的行会在「SEO 与翻译覆盖」中列出，不会自动用中文顶替发布。
          </p>
        </div>
      </div>

      <CollectionEditor collection={COLLECTIONS.categories} rows={categories as Record<string, unknown>[]} />
      <CollectionEditor collection={COLLECTIONS.services} rows={services as Record<string, unknown>[]} />
      <CollectionEditor collection={COLLECTIONS.faqs} rows={faqs as Record<string, unknown>[]} />
      <CollectionEditor collection={COLLECTIONS.team_roles} rows={team as Record<string, unknown>[]} />
      <CollectionEditor
        collection={COLLECTIONS.warehouse_items}
        rows={warehouse as Record<string, unknown>[]}
      />
    </>
  );
}
