import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/site/contact-form";
import { EditorialPhoto } from "@/components/site/editorial-photo";
import { InnerHead } from "@/components/site/editorial-layout";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getPageCopy } from "@/lib/editorial-media";
import { getSiteData, localizedField, metaFor } from "@/lib/site";

const content = {
  zh: { title: "把问题，交给我们。", lead: "一般业务咨询可以在这里留言。已有型号、数量或 BOM？提交询价能将采购资料与后续记录放在一起。", form: "业务留言", formLead: "请留下可回复的邮箱，并说明你的问题或合作需求。", inquiry: "已有明确的采购需求？", inquiryBody: "用询价表逐项填写型号、品牌、数量和批次要求，或上传一份 BOM。提交后保留询价编号，方便后续沟通。", channels: "联系信息", prepare: "询价前准备", items: ["完整型号与数量", "品牌、封装及批次要求", "目标交期与所需文件"], faq: "先看看常见问题" },
  en: { title: "Let’s discuss the requirements.", lead: "Leave a message for general business questions. Already have part numbers, quantities or a BOM? An RFQ keeps procurement details and follow-up records together.", form: "Business message", formLead: "Leave an email we can reply to and describe your question or collaboration request.", inquiry: "Have a defined procurement need?", inquiryBody: "Use the inquiry form for part numbers, brands, quantities and date-code requirements, or upload a BOM. Keep the inquiry reference for follow-up.", channels: "Contact information", prepare: "Prepare for your RFQ", items: ["Full part numbers and quantities", "Brand, package and date-code requirements", "Target timing and required documents"], faq: "Read the common questions" },
  ru: { title: "Обсудим ваши требования.", lead: "Здесь можно оставить общие вопросы по сотрудничеству. Если уже есть артикулы, количество или BOM, запрос цены объединит закупочные данные и дальнейшую переписку.", form: "Деловое сообщение", formLead: "Оставьте адрес электронной почты для ответа и опишите вопрос или предложение о сотрудничестве.", inquiry: "Уже есть задача закупки?", inquiryBody: "Укажите в форме артикулы, бренды, количество и дата-коды либо загрузите BOM. Сохраните номер запроса для дальнейшего общения.", channels: "Контактная информация", prepare: "Подготовьте для запроса", items: ["Полные артикулы и количество", "Требования к бренду, корпусу и дата-коду", "Желаемые сроки и документы"], faq: "Частые вопросы" },
};
const usable = (value: string) => Boolean(value.trim()) && !/待补|待确认|pending|to be confirmed|уточняется/i.test(value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = getPageCopy("contact", locale, content[locale].title, content[locale].lead);
  return { ...metaFor("/contact", locale, { title: c.title, description: c.lead }), alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "zh";
  const dict = getDictionary(locale);
  const c = content[locale];
  const page = getPageCopy("contact", locale, c.title, c.lead);
  const { company } = getSiteData().config;
  const address = localizedField(company as unknown as Record<string, unknown>, "address", locale);
  const hours = localizedField(company as unknown as Record<string, unknown>, "hours", locale);
  const channels = [
    { label: dict.common.email, value: company.email, href: `mailto:${company.email}` },
    { label: dict.common.phone, value: company.phone, href: `tel:${company.phone.replace(/\s/g, "")}` },
    { label: "WhatsApp", value: company.whatsapp, href: "" },
    { label: locale === "zh" ? "微信" : "WeChat", value: company.wechat, href: "" },
    { label: dict.common.address, value: address, href: "" },
    { label: dict.common.hours, value: hours, href: "" },
  ].filter(channel => usable(channel.value));
  return <>
    <InnerHead locale={locale} eyebrow={dict.contact.eyebrow} title={page.title} lead={page.lead} breadcrumbs={[{ label: dict.nav.contact }]} />
    <section style={{ paddingBottom: "clamp(64px,7vw,100px)" }}><div className="container"><div className="u-split" style={{ alignItems: "start" }}>
      <div style={{ padding: "clamp(24px,3vw,42px)", border: "1px solid var(--line)", background: "#fff" }}>
        <h2 className="h3">{c.form}</h2><p className="small" style={{ marginBlock: "12px 28px" }}>{c.formLead}</p>
        <ContactForm locale={locale} />
        <div style={{ marginTop: 38, paddingTop: 28, borderTop: "1px solid var(--line)" }}><h3 className="h3">{c.inquiry}</h3><p className="small" style={{ marginBlock: 18 }}>{c.inquiryBody}</p><Link className="btn btn--primary" href={`/${locale}/inquiry`}>{dict.common.submitInquiry}<span aria-hidden="true">↗</span></Link></div>
      </div>
      <div>
        {channels.length ? <><h2 className="mono-sm">{c.channels}</h2><dl style={{ marginTop: 20, marginBottom: 32 }}>{channels.map(channel => <div key={channel.label} style={{ display: "grid", gridTemplateColumns: "minmax(90px,.4fr) minmax(0,1fr)", gap: 18, paddingBlock: 16, borderTop: "1px solid var(--line)" }}><dt className="mono-sm">{channel.label}</dt><dd style={{ fontSize: 13, overflowWrap: "anywhere" }}>{channel.href ? <a className="link-underline" href={channel.href}>{channel.value}</a> : channel.value}</dd></div>)}</dl></> : null}
        <EditorialPhoto mediaKey={page.imageKey || "bom"} locale={locale} />
        <div className="u-copy" style={{ marginTop: 32 }}><p className="eyebrow">{c.prepare}</p><ul style={{ marginTop: 14 }}>{c.items.map((item, index) => <li key={item} style={{ display: "flex", gap: 16, paddingBlock: 12, fontSize: 13, borderTop: "1px solid var(--line)" }}><span className="mono">{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul></div>
      </div>
    </div></div></section>
    <div className="container"><div className="u-cta"><div><h2>{c.faq}</h2></div><Link className="link-underline" href={`/${locale}/faq`}>{dict.faqPage.title} ↗</Link></div></div>
  </>;
}
