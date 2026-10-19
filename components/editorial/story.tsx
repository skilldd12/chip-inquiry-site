import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { getSiteData, localizedField, metaFor } from "@/lib/site";
import { getMedia, getPageCopy } from "@/lib/editorial-media";
import { editorialCategories, localized, pick, type Localized } from "@/lib/editorial";
import s from "./editorial.module.css";

export { s };
export type PageParams = { params: Promise<{ locale: string; slug: string }> };
export type IndexParams = { params: Promise<{ locale: string }> };
export function validLocale(raw: string): Locale { if (!isLocale(raw)) notFound(); return raw; }
export function staticSlugs(items: { slug: string }[]) { return locales.flatMap(locale => items.map(({ slug }) => ({ locale, slug }))); }
export function editorialMeta(locale: Locale, path: string, title: string, description: string): Metadata {
  const meta = metaFor(`/${path}`, locale, { title, description });
  return { ...meta, alternates: { canonical: `/${locale}/${path}`, languages: Object.fromEntries(locales.map(l => [l === "zh" ? "zh-CN" : l, `/${l}/${path}`])) } };
}
export function Figure({ image, locale, wide, square, priority = false }: { image: string; locale: Locale; wide?: boolean; square?: boolean; priority?: boolean }) {
  const media = getMedia(image, locale);
  return <figure className={`${s.figure} ${wide ? s.wide : ""} ${square ? s.square : ""}`}><div className={s.visual}><Image src={media.src} alt={media.alt} width={1440} height={1080} sizes={wide ? "(max-width: 680px) 100vw, 90vw" : "(max-width: 680px) 100vw, 50vw"} priority={priority} style={{ objectPosition: media.position }} /></div><figcaption>{media.caption}{media.kind === "illustrative" && !media.caption ? pick(locale, "AI 场景示意，不代表自有设施或实拍产品。", "AI illustration; not a photograph of our facilities or supplied parts.", "AI-иллюстрация; не фото наших помещений или поставляемых компонентов.") : ""}</figcaption></figure>;
}
export function Breadcrumbs({ locale, items }: { locale: Locale; items: { label: string; href?: string }[] }) {
  return <nav className={s.crumbs} aria-label={pick(locale, "面包屑导航", "Breadcrumb", "Навигационная цепочка")}><Link href={`/${locale}`}>{pick(locale, "首页", "Home", "Главная")}</Link>{items.map((item,i) => <span key={i} style={{ display:"contents" }}><span aria-hidden="true">/</span>{item.href ? <Link href={`/${locale}/${item.href}`}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>;
}
export function StoryHero({ locale, pageKey, eyebrow, title, lead, image, children, crumbs }: { locale: Locale; pageKey: string; eyebrow: string; title: string; lead: string; image: string; children?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  const copy = getPageCopy(pageKey, locale, title, lead);
  return <div className={s.container}><Breadcrumbs locale={locale} items={crumbs || [{ label: copy.title }]} /><header className={s.hero}><div><p className={s.eyebrow}>{eyebrow}</p><h1>{copy.title}</h1><p className={s.lead}>{copy.lead}</p>{children}</div><Figure image={copy.imageKey || image} locale={locale} priority /></header></div>;
}
export function InquiryLink({ locale, context = {}, label }: { locale: Locale; context?: Record<string, string>; label?: string }) {
  const query = new URLSearchParams(context).toString();
  return <Link className={s.primary} href={`/${locale}/inquiry${query ? `?${query}` : ""}`}>{label || pick(locale,"提交询价","Send an RFQ","Отправить запрос")}<span aria-hidden="true">↗</span></Link>;
}
export function CTA({ locale, context = {}, title, lead }: { locale: Locale; context?: Record<string,string>; title?: string; lead?: string }) {
  return <div className={s.container}><section className={s.cta}><div><h2>{title || pick(locale,"把下一份需求，交给清楚的沟通。","Start with a clear requirement.","Начните с понятного запроса.")}</h2><p>{lead || pick(locale,"提供完整型号、数量与目标交期；未收录的品牌或型号，也可以直接询价。","Send full part numbers, quantities and your required delivery. You can also ask for brands or parts that are not listed.","Пришлите полные артикулы, количество и срок. Можно запросить и не представленные на сайте бренды или компоненты.")}</p></div><InquiryLink locale={locale} context={context} /></section></div>;
}
export function TextRows({ items, locale }: { items: Localized[]; locale: Locale }) {
  return <ol className={s.rows}>{items.map((item,i) => <li key={i} className={s.row}><span className={s.number}>{String(i+1).padStart(2,"0")}</span><div className={s.rowTitle}>{localized(locale,item)}</div></li>)}</ol>;
}
export function CategoryLinks({ slugs, locale }: { slugs: string[]; locale: Locale }) {
  const { categories } = getSiteData();
  return <div className={s.tags}>{categories.filter(c=>slugs.includes(c.slug)).map(c=><Link className={s.tag} key={c.slug} href={editorialCategories.some(item=>item.slug===c.slug)?`/${locale}/products/${c.slug}`:`/${locale}/inquiry?category=${encodeURIComponent(localizedField(c as unknown as Record<string,unknown>,"name",locale))}`}>{localizedField(c as unknown as Record<string,unknown>,"name",locale)} ↗</Link>)}</div>;
}
export function BrandLinks({ slugs, locale }: { slugs: string[]; locale: Locale }) {
  const { brands } = getSiteData();
  const detailed = ["ti","adi","st","nxp","infineon","amd","micron","samsung"];
  return <div className={s.brandLinks}>{brands.filter(b=>slugs.includes(b.slug)).map(b=><Link key={b.slug} href={detailed.includes(b.slug)?`/${locale}/brands/${b.slug}`:`/${locale}/inquiry?brand=${encodeURIComponent(b.name)}`}>{b.name} <span aria-hidden="true">↗</span></Link>)}</div>;
}
/** Resolve saved associations against public data before exposing any destination. */
export function ConfiguredAssociations({ pageKey, locale, showBrands = true, showCategories = true }: { pageKey: string; locale: Locale; showBrands?: boolean; showCategories?: boolean }) {
  const copy = getPageCopy(pageKey, locale, "", "");
  const data = getSiteData();
  const brandSlugs = showBrands ? data.brands.filter(brand => copy.relatedBrands.includes(brand.slug)).map(brand => brand.slug) : [];
  const categorySlugs = showCategories ? data.categories.filter(category => copy.relatedCategories.includes(category.slug)).map(category => category.slug) : [];
  if (!brandSlugs.length && !categorySlugs.length) return null;
  return <section className={s.section}><div className={s.container}><div className={s.sectionHead}><div><p className={s.eyebrow}>{pick(locale,"相关采购方向","Related sourcing directions","Связанные направления поиска")}</p><h2 className={s.spaced}>{pick(locale,"从品牌与器件继续查看。","Continue by brand or component.","Продолжите по брендам и компонентам.")}</h2></div><p>{pick(locale,"以下关联帮助定位采购需求；具体型号、可供数量、批次与交期仍需逐项确认。","These links help define your sourcing requirement. Specific parts, available quantities, lots and delivery still require individual confirmation.","Ссылки помогают определить закупочную задачу. Конкретные артикулы, количество, партия и срок подтверждаются отдельно.")}</p></div><div className={s.twoPanels}>{categorySlugs.length ? <div><h3>{pick(locale,"相关器件类别","Related component categories","Связанные категории компонентов")}</h3><CategoryLinks slugs={categorySlugs} locale={locale}/></div> : null}{brandSlugs.length ? <div><h3>{pick(locale,"相关品牌","Related brands","Связанные бренды")}</h3><BrandLinks slugs={brandSlugs} locale={locale}/></div> : null}</div></div></section>;
}
