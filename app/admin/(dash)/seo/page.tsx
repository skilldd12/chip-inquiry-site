import { COLLECTIONS } from "@/lib/admin-schema";
import { CollectionEditor } from "@/components/admin/collection-editor";
import { listAllFaqs, listCategories, listSeo, listServices, listTeamRoles, listWarehouseItems } from "@/lib/db.js";
import { hasTranslation } from "@/lib/core.js";

export const dynamic = "force-dynamic";

const LOCALES = ["zh", "en", "ru"] as const;

export default async function AdminSeo() {
  const rows = listSeo();
  const sources = [
    { name: "类目名称", rows: listCategories(), base: "name" },
    { name: "类目说明", rows: listCategories(), base: "blurb" },
    { name: "服务标题", rows: listServices(), base: "title" },
    { name: "服务描述", rows: listServices(), base: "body" },
    { name: "FAQ 问题", rows: listAllFaqs(), base: "question" },
    { name: "FAQ 回答", rows: listAllFaqs(), base: "answer" },
    { name: "团队岗位", rows: listTeamRoles(), base: "title" },
    { name: "仓储条目", rows: listWarehouseItems(), base: "title" },
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="mono-sm">SEO & I18N</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
            SEO 与翻译覆盖
          </h1>
          <p className="small" style={{ marginTop: 6, maxWidth: "82ch" }}>
            页面 title / description 留空时使用页面默认文案。缺少翻译的条目在下方列出，运营应按实际语言补齐后再启用对应语言版本。
          </p>
        </div>
      </div>

      <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <p className="mono-sm">多语言覆盖（按字段统计）</p>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>内容</th>
              <th>总条数</th>
              {LOCALES.map((l) => (
                <th key={l}>{l.toUpperCase()} 已翻译</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={`${source.name}-${source.base}`}>
                <td>{source.name}</td>
                <td>{source.rows.length}</td>
                {LOCALES.map((locale) => {
                  const filled = source.rows.filter((row) =>
                    hasTranslation(row as unknown as Record<string, unknown>, source.base, locale)
                  ).length;
                  const missing = source.rows.length - filled;
                  return (
                    <td key={locale} className="numeric">
                      {filled}
                      {missing > 0 ? (
                        <span style={{ color: "#7a5d30", marginLeft: 6, fontSize: 11 }}>
                          缺 {missing}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 10 }}>
          前台读取时按 locale → en → zh 顺序回退，但后台不会把回退内容视为“已翻译”。
        </p>
      </section>

      <CollectionEditor collection={COLLECTIONS.page_seo} rows={rows as Record<string, unknown>[]} />
    </>
  );
}
