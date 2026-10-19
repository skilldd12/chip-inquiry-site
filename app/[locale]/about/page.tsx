import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPhoto } from "@/components/site/editorial-photo";
import { InnerHead, InquiryCta } from "@/components/site/editorial-layout";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getPageCopy } from "@/lib/editorial-media";
import { getSiteData, localizedField, metaFor } from "@/lib/site";

const content = {
  zh: { title: "把采购需求，接到交付。", lead: "轴点电子面向电子元器件采购需求，提供品牌寻源、BOM 配单、供货与替代料支持，以及订单交付中的品质核对。", story: "围绕每一个型号协作", body: "从一条型号到一份多行 BOM，采购需要明确的型号、数量、批次和交期。我们围绕这些信息核对渠道与供货条件，把需要你方决定的事项单独说明，再衔接订单、复核和发运。", team: "团队如何接力", teamLead: "客户对接、采购、品质与仓储围绕同一份需求协作。每个环节保留自己的核对重点，减少信息在交接中丢失。", business: "业务范围", businessBody: "电子元器件与芯片寻源 · BOM 配单 · 订单交付", company: "公司信息", collaboration: "需求 → 寻源 → 核对 → 交付", contact: "联系与合作" },
  en: { title: "Connecting requirements to delivery.", lead: "AXIOM COMPONENTS supports electronic component procurement through brand sourcing, BOM kitting, supply alternatives and quality verification during order delivery.", story: "Work around each part number", body: "A single part and a multi-line BOM both depend on clear quantities, date codes and timing. We use those requirements to check channels and supply terms, highlight decisions that need your approval, and connect the order to verification and dispatch.", team: "How the work moves", teamLead: "Customer contact, purchasing, quality and warehouse roles work from the same requirements. Each handover has its own checks to keep the details together.", business: "Business scope", businessBody: "Component and chip sourcing · BOM kitting · Order delivery", company: "Company information", collaboration: "Requirements → Sourcing → Verification → Delivery", contact: "Contact and collaboration" },
  ru: { title: "От требований к поставке.", lead: "AXIOM COMPONENTS помогает закупать электронные компоненты: поиск по брендам, комплектация BOM, варианты поставки и проверка качества при исполнении заказа.", story: "Работа с каждым артикулом", body: "И для одной позиции, и для многострочного BOM важны количество, дата-код и срок. На основе этих требований мы проверяем каналы и условия поставки, отдельно отмечаем решения для вашего согласования, затем переходим к заказу, сверке и отправке.", team: "Как передаётся работа", teamLead: "Работа с клиентами, закупки, качество и склад опираются на единые требования. У каждого этапа свои проверки, чтобы сохранить детали при передаче заказа.", business: "Направления работы", businessBody: "Поиск компонентов и микросхем · Комплектация BOM · Поставка заказов", company: "О компании", collaboration: "Требования → Поиск → Проверка → Поставка", contact: "Связь и сотрудничество" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getPageCopy("about", locale, content[locale].title, content[locale].lead);
  return { ...metaFor("/about", locale, { title: copy.title, description: copy.lead }), alternates: { canonical: `/${locale}/about` } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "zh";
  const dict = getDictionary(locale);
  const c = content[locale];
  const page = getPageCopy("about", locale, c.title, c.lead);
  const { teamRoles, config } = getSiteData();
  const details = [
    { label: locale === "zh" ? "注册主体" : locale === "ru" ? "Юридическое лицо" : "Legal entity", value: config.company.legal_name },
    { label: locale === "zh" ? "成立年份" : locale === "ru" ? "Год основания" : "Founded", value: config.company.founded },
    { label: dict.common.address, value: localizedField(config.company as unknown as Record<string, unknown>, "address", locale) },
  ].filter(item => item.value.trim() && !/待补|待确认|pending|to be confirmed|уточняется/i.test(item.value));
  return <>
    <InnerHead locale={locale} eyebrow={dict.about.eyebrow} title={page.title} lead={page.lead} breadcrumbs={[{ label: dict.nav.about }]} aside={<><p className="mono-sm">{c.business}</p><p style={{ marginTop: 14 }}>{c.businessBody}</p></>} />
    <div className="container"><EditorialPhoto mediaKey={page.imageKey || "team"} locale={locale} className="u-photo--wide" priority /></div>
    <section className="u-section" style={{ borderTop: 0 }}><div className="container"><div className="u-split">
      <div><p className="eyebrow">{c.collaboration}</p><h2 className="u-title">{c.story}</h2></div>
      <div className="u-copy"><p className="body">{c.body}</p><Link href={`/${locale}/capabilities`} className="link-underline">{dict.nav.capabilities}<span aria-hidden="true">↗</span></Link></div>
    </div></div></section>
    <section className="u-section u-section--white" id="team" style={{ scrollMarginTop: 100 }}><div className="container"><div className="u-split" style={{ alignItems: "start" }}>
      <div className="u-copy"><p className="eyebrow">{dict.about.teamTitle}</p><h2 className="u-title">{c.team}</h2><p className="body">{c.teamLead}</p><Link href={`/${locale}/contact`} className="link-underline">{c.contact}<span aria-hidden="true">↗</span></Link></div>
      <div className="u-role-list" style={{ marginTop: 0 }}>{teamRoles.map((role, index) => <div key={role.id}>
        <h3><span className="mono" style={{ display: "block", marginBottom: 12 }}>{String(index + 1).padStart(2, "0")}</span>{localizedField(role as unknown as Record<string, unknown>, "title", locale)}</h3>
        <p>{localizedField(role as unknown as Record<string, unknown>, "body", locale)}</p>
      </div>)}</div>
    </div></div></section>
    {details.length ? <section className="u-section"><div className="container"><div className="u-split"><h2 className="u-title">{c.company}</h2><dl className="u-role-list">{details.map(item => <div key={item.label}><dt className="mono-sm">{item.label}</dt><dd className="body">{item.value}</dd></div>)}</dl></div></div></section> : null}
    <InquiryCta pageKey="about" locale={locale} secondary={{ label: dict.nav.contact, href: `/${locale}/contact` }} />
  </>;
}
