"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EDITORIAL_LOCALES, EDITORIAL_MEDIA_KEYS, isEditorialAssetPath, validateEditorialConfig,
  type EditorialConfig, type EditorialLocalized, type EditorialMedia, type EditorialPage,
} from "@/lib/editorial-config";

type Option = { slug: string; name: string };
const emptyLocalized = (): EditorialLocalized => ({ zh: "", en: "", ru: "" });
const defaultMedia = (key: string): EditorialMedia => ({
  src: `/images/editorial/${key}.webp`, alt: emptyLocalized(), caption: emptyLocalized(),
  source: "AI generated illustrative image", kind: "illustrative", position: "50% 50%",
});
const defaultPage = (): EditorialPage => ({ title: emptyLocalized(), lead: emptyLocalized(), imageKey: "", relatedBrands: [], relatedCategories: [] });
const PAGE_KEYS = ["home", "products", "brands", "capabilities", "industries", "resources", "quality", "warehouse-quality", "about", "contact", "faq"];
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };

function Translations({ id, label, value, multiline, onChange }: {
  id: string; label: string; value: EditorialLocalized; multiline?: boolean; onChange: (value: EditorialLocalized) => void;
}) {
  return <div style={grid}>{EDITORIAL_LOCALES.map((locale) => <div className="field" key={locale}>
    <label className="label" htmlFor={`${id}-${locale}`}>{label} · {locale.toUpperCase()}</label>
    {multiline ? <textarea className="textarea" rows={4} id={`${id}-${locale}`} value={value[locale]} onChange={(e) => onChange({ ...value, [locale]: e.target.value })} />
      : <input className="input" id={`${id}-${locale}`} value={value[locale]} onChange={(e) => onChange({ ...value, [locale]: e.target.value })} />}
  </div>)}</div>;
}

function Relations({ label, options, selected, onChange }: { label: string; options: Option[]; selected: string[]; onChange: (value: string[]) => void }) {
  // Retain old relations in the control if a catalogue item has since been hidden.
  const values = [...options, ...selected.filter((slug) => !options.some((option) => option.slug === slug)).map((slug) => ({ slug, name: slug }))];
  return <fieldset style={{ border: "1px solid var(--line)", padding: 12, minWidth: 0 }}>
    <legend className="label">{label}</legend>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>{values.map((option) => <label key={option.slug} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <input type="checkbox" checked={selected.includes(option.slug)} onChange={(e) => onChange(e.target.checked ? [...selected, option.slug] : selected.filter((slug) => slug !== option.slug))} />{option.name}
    </label>)}</div>
  </fieldset>;
}

export function EditorialEditor({ initial, brands, categories }: { initial: EditorialConfig; brands: Option[]; categories: Option[] }) {
  const router = useRouter();
  const [editorial, setEditorial] = useState(initial);
  const [tab, setTab] = useState<"media" | "pages">("media");
  const [mediaKey, setMediaKey] = useState("warehouse");
  const [pageKey, setPageKey] = useState("products");
  const [newPageKey, setNewPageKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [brokenPreview, setBrokenPreview] = useState("");
  const mediaKeys = [...new Set([...EDITORIAL_MEDIA_KEYS, ...Object.keys(editorial.media)])];
  const pageKeys = [...new Set([...PAGE_KEYS, ...categories.map((row) => `products/${row.slug}`), ...brands.map((row) => `brands/${row.slug}`), ...Object.keys(editorial.pages), pageKey])];
  const media = editorial.media[mediaKey] ?? defaultMedia(mediaKey);
  const page = editorial.pages[pageKey] ?? defaultPage();
  function update(value: EditorialConfig) { setEditorial(value); setDirty(true); setNotice(""); }
  const updateMedia = (patch: Partial<EditorialMedia>) => update({ ...editorial, media: { ...editorial.media, [mediaKey]: { ...media, ...patch } } });
  const updatePage = (patch: Partial<EditorialPage>) => update({ ...editorial, pages: { ...editorial.pages, [pageKey]: { ...page, ...patch } } });
  function reset() {
    if (tab === "media") { const next = { ...editorial.media }; delete next[mediaKey]; update({ ...editorial, media: next }); }
    else { const next = { ...editorial.pages }; delete next[pageKey]; update({ ...editorial, pages: next }); }
  }
  async function save() {
    const checked = validateEditorialConfig(editorial);
    if (!checked.ok) { setNotice(checked.error); setFailed(true); return; }
    setBusy(true); setNotice(""); setFailed(false);
    try {
      const response = await fetch("/api/admin/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ editorial: checked.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "保存失败，请重新登录后重试。");
      setEditorial(checked.value); setDirty(false); setNotice("已保存。前台将在下次加载时使用更新内容。"); router.refresh();
    } catch (error) { setFailed(true); setNotice(error instanceof Error ? error.message : "保存失败，请重试。"); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) { setFailed(true); setNotice("图片不能超过 8 MB。"); return; }
    setBusy(true); setNotice(""); setFailed(false);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !isEditorialAssetPath(result.src || "")) throw new Error(result.message || "图片上传失败。");
      updateMedia({ src: result.src });
      setBrokenPreview("");
      setNotice("图片已上传。请补充来源与三语说明，然后保存内容。");
    } catch (error) { setFailed(true); setNotice(error instanceof Error ? error.message : "图片上传失败。"); }
    finally { setBusy(false); }
  }
  return <div style={{ display: "grid", gap: 18 }}>
    <div style={{ display: "flex", gap: 8 }} aria-label="编辑栏目">
      <button className={`btn btn--sm${tab === "media" ? " btn--primary" : ""}`} type="button" aria-pressed={tab === "media"} onClick={() => setTab("media")}>图片素材</button>
      <button className={`btn btn--sm${tab === "pages" ? " btn--primary" : ""}`} type="button" aria-pressed={tab === "pages"} onClick={() => setTab("pages")}>页面文案与关联</button>
    </div>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      {tab === "media" ? <section className="panel" style={{ padding: 20, display: "grid", gap: 18 }}>
        <div className="field"><label className="label" htmlFor="editorial-media">选择图片位置</label><select className="select" id="editorial-media" value={mediaKey} onChange={(e) => setMediaKey(e.target.value)}>{mediaKeys.map((key) => <option key={key}>{key}</option>)}</select></div>
        <p className="small">上传图片，或填写已有本地图片路径。示意图片保持“示意”标记；经核实的实拍图片可改为“实拍”。</p>
        <div className="field"><label className="label" htmlFor="editorial-upload">上传替换图片（PNG / JPEG / WebP / AVIF，最大 8 MB）</label><input className="input" id="editorial-upload" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void upload(file); }} /></div>
        {isEditorialAssetPath(media.src) && brokenPreview !== media.src ? <img src={media.src} alt={media.alt.zh || "当前素材预览"} width={640} height={360} onError={() => setBrokenPreview(media.src)} style={{ width: "100%", maxWidth: 640, height: "auto", aspectRatio: "16 / 9", objectFit: "cover", objectPosition: media.position, background: "#eef0f1" }} /> : <p className="field-error">图片暂时无法预览，请检查文件路径。</p>}
        <div style={grid}>
          <div className="field"><label className="label" htmlFor="editorial-src">本地图片路径</label><input className="input" id="editorial-src" value={media.src} onChange={(e) => updateMedia({ src: e.target.value })} /></div>
          <div className="field"><label className="label" htmlFor="editorial-kind">图片性质</label><select className="select" id="editorial-kind" value={media.kind} onChange={(e) => updateMedia({ kind: e.target.value as EditorialMedia["kind"] })}><option value="illustrative">示意图片</option><option value="photo">实拍图片</option></select></div>
          <div className="field"><label className="label" htmlFor="editorial-focus">画面焦点（横向% 纵向%）</label><input className="input" id="editorial-focus" placeholder="50% 50%" value={media.position} onChange={(e) => updateMedia({ position: e.target.value })} /></div>
        </div>
        <div className="field"><label className="label" htmlFor="editorial-source">素材来源 / 使用授权说明</label><input className="input" id="editorial-source" value={media.source} onChange={(e) => updateMedia({ source: e.target.value })} /></div>
        <Translations id="media-alt" label="替代文本" value={media.alt} onChange={(alt) => updateMedia({ alt })} />
        <Translations id="media-caption" label="图片说明" value={media.caption} multiline onChange={(caption) => updateMedia({ caption })} />
      </section> : <section className="panel" style={{ padding: 20, display: "grid", gap: 18 }}>
        <div className="field"><label className="label" htmlFor="editorial-page">选择页面</label><select className="select" id="editorial-page" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>{pageKeys.map((key) => <option key={key}>{key}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "end", flexWrap: "wrap", gap: 8 }}><div className="field" style={{ flex: 1 }}><label className="label" htmlFor="editorial-new-page">其他已有页面路径（不含语言前缀）</label><input className="input" id="editorial-new-page" placeholder="industries/industrial" value={newPageKey} onChange={(e) => setNewPageKey(e.target.value)} /></div><button className="btn btn--sm" type="button" onClick={() => { const key = newPageKey.trim().replace(/^\/+|\/+$/g, ""); if (/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(key) && key.length <= 100) { setPageKey(key); setNewPageKey(""); setNotice(""); } else { setFailed(true); setNotice("请输入英文小写、数字、短横线或斜线组成的页面路径。"); } }}>编辑该页面</button></div>
        <p className="small">文案留空使用页面默认内容。这里修改已有页面的标题、简介与关联内容，不会创建新的前台路由。</p>
        <Translations id="page-title" label="页面标题" value={page.title} onChange={(title) => updatePage({ title })} />
        <Translations id="page-lead" label="页面简介" value={page.lead} multiline onChange={(lead) => updatePage({ lead })} />
        {pageKey !== "home" ? <div className="field"><label className="label" htmlFor="editorial-page-image">页面主图</label><select className="select" id="editorial-page-image" value={page.imageKey} onChange={(e) => updatePage({ imageKey: e.target.value })}><option value="">使用页面默认图片</option>{[...new Set([...mediaKeys, page.imageKey])].filter(Boolean).map((key) => <option key={key}>{key}</option>)}</select></div> : <p className="small">首页可在这里修改标题与简介；3D 主视觉保持统一的 BGA 场景。</p>}
        <Relations label="关联品牌" options={brands} selected={page.relatedBrands} onChange={(relatedBrands) => updatePage({ relatedBrands })} />
        <Relations label="关联类目" options={categories} selected={page.relatedCategories} onChange={(relatedCategories) => updatePage({ relatedCategories })} />
      </section>}
    </fieldset>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <button className="btn btn--primary btn--sm" type="button" disabled={busy || !dirty} onClick={save}>{busy ? "保存中…" : "保存图片与页面内容"}</button>
      <button className="btn btn--sm" type="button" disabled={busy || !(tab === "media" ? editorial.media[mediaKey] : editorial.pages[pageKey])} onClick={reset}>恢复当前项默认内容</button>
      {dirty ? <span className="small">有未保存的修改</span> : null}
    </div>
    <p role="status" aria-live="polite" className={failed ? "field-error" : "small"} style={{ minHeight: 24 }}>{notice}</p>
  </div>;
}
