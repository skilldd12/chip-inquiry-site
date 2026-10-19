import type { ReactNode } from "react";
import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";
import { ConfiguredAssociations } from "@/components/editorial/story";

export type EditorialBreadcrumb = { label: string; href?: string };

export function InnerHead({ locale, eyebrow, title, lead, breadcrumbs = [], aside }: {
  locale: Locale; eyebrow: string; title: string; lead: string;
  breadcrumbs?: EditorialBreadcrumb[]; aside?: ReactNode;
}) {
  const dict = getDictionary(locale);
  return <header className="u-inner-head"><div className="container">
    <nav className="u-crumbs" aria-label={locale === "zh" ? "面包屑导航" : locale === "ru" ? "Навигационная цепочка" : "Breadcrumb"}>
      <Link href={`/${locale}`}>{dict.nav.home}</Link>
      {breadcrumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`} style={{ display: "inline-flex", gap: 10 }}>
        <span aria-hidden="true">/</span>{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>}
      </span>)}
    </nav>
    <div className={aside ? "u-inner-head__row" : undefined}>
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="u-inner-lead">{lead}</p></div>
      {aside ? <div className="u-inner-head__aside">{aside}</div> : null}
    </div>
  </div></header>;
}

export function InquiryCta({ locale, title, body, secondary, pageKey }: {
  locale: Locale; title?: string; body?: string; secondary?: { label: string; href: string }; pageKey?: string;
}) {
  const dict = getDictionary(locale);
  const copy = {
    zh: ["从一份明确的需求开始", "提供型号、数量、目标批次与交期；多型号需求可直接上传 BOM。"],
    en: ["Start with the requirements.", "Send part numbers, quantities, target date codes and timing. Upload a BOM for multiple lines."],
    ru: ["Начните с требований.", "Укажите артикулы, количество, дата-коды и сроки. Для нескольких позиций загрузите BOM."],
  }[locale];
  return <>{pageKey ? <ConfiguredAssociations pageKey={pageKey} locale={locale} /> : null}<section><div className="container"><div className="u-cta">
    <div><h2>{title || copy[0]}</h2><p>{body || copy[1]}</p></div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
      <Link href={`/${locale}/inquiry`} className="btn btn--primary">{dict.nav.inquiry}<span aria-hidden="true">↗</span></Link>
      {secondary ? <Link href={secondary.href} className="link-underline">{secondary.label}<span aria-hidden="true">↗</span></Link> : null}
    </div>
  </div></div></section></>;
}
