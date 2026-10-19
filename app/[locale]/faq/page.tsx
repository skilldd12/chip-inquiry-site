import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPhoto } from "@/components/site/editorial-photo";
import { FaqList } from "@/components/site/faq-list";
import { InnerHead, InquiryCta } from "@/components/site/editorial-layout";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getPageCopy } from "@/lib/editorial-media";
import { getSiteData, localizedField, metaFor } from "@/lib/site";

const content = {
  zh: { title: "采购前，先说清楚。", lead: "关于询价、BOM、包装与供货资料的常见问题。具体型号的条件，在报价与订单中逐项确认。", browse: "按主题查找", groups: ["询价与 BOM", "包装与样品", "货源与资料"], related: "进一步了解", quality: "品质与追溯", delivery: "仓储与交付", reply: "提交后请保留询价编号。型号、渠道与 BOM 行数会影响核对时间；具体回复安排在跟进中确认。多型号需求可先反馈已确认的条目，其余单独说明。" },
  en: { title: "Clarity before procurement.", lead: "Common questions about RFQs, BOMs, packaging and sourcing documents. Terms for a specific part are confirmed in the quotation and order.", browse: "Browse by topic", groups: ["RFQs and BOMs", "Packaging and samples", "Sourcing and documents"], related: "Explore the process", quality: "Quality and traceability", delivery: "Warehouse and delivery", reply: "Keep your inquiry reference after submission. Verification time depends on the part, channel and BOM size; reply arrangements are confirmed during follow-up. For multiple lines, confirmed items may be shared first and the remaining items identified separately." },
  ru: { title: "Ясность до закупки.", lead: "Ответы на вопросы о запросах цены, BOM, упаковке и документах по поставке. Условия конкретной позиции подтверждаются в предложении и заказе.", browse: "Поиск по темам", groups: ["Запросы и BOM", "Упаковка и образцы", "Источники и документы"], related: "Подробнее о процессе", quality: "Качество и прослеживаемость", delivery: "Склад и поставка", reply: "После отправки сохраните номер запроса. Время проверки зависит от позиции, канала и объёма BOM; порядок ответа уточняется при дальнейшем общении. По многострочному запросу подтверждённые позиции могут сообщаться первыми, а остальные указываются отдельно." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getPageCopy("faq", locale, content[locale].title, content[locale].lead);
  return { ...metaFor("/faq", locale, { title: page.title, description: page.lead }), alternates: { canonical: `/${locale}/faq` } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "zh";
  const dict = getDictionary(locale);
  const c = content[locale];
  const page = getPageCopy("faq", locale, c.title, c.lead);
  // A response-time promise requires verification; retain the question with a neutral answer.
  const faqs = getSiteData().faqs;
  const topicFor = (question: string) => /BOM|格式/.test(question) ? 0 : /包装|起订|样品/.test(question) ? 1 : /授权|代理|文件|资料/.test(question) ? 2 : 0;
  const grouped = [0, 1, 2].map(topic => faqs.filter(faq => topicFor(faq.question_zh) === topic));
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(faq => ({ "@type": "Question", name: localizedField(faq as unknown as Record<string, unknown>, "question", locale), acceptedAnswer: { "@type": "Answer", text: localizedField(faq as unknown as Record<string, unknown>, "answer", locale) } })) };
  let startIndex = 1;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <InnerHead locale={locale} eyebrow={dict.faqPage.eyebrow} title={page.title} lead={page.lead} breadcrumbs={[{ label: dict.faqPage.title }]} />
    {page.imageKey ? <div className="container" style={{marginBottom:38}}><EditorialPhoto mediaKey={page.imageKey} locale={locale} className="u-photo--wide" /></div> : null}
    <section style={{ paddingBottom: "clamp(64px,7vw,100px)" }}><div className="container"><div className="grid12">
      <aside className="g-4"><p className="eyebrow">{c.browse}</p><nav aria-label={c.browse} style={{ marginTop: 22, maxWidth: "32ch" }}>{c.groups.map((title, index) => grouped[index].length ? <a key={title} href={`#faq-${index}`} style={{ display: "flex", justifyContent: "space-between", paddingBlock: 18, borderTop: "1px solid var(--line)", fontSize: 14 }}><span>{title}</span><span className="mono">{String(grouped[index].length).padStart(2, "0")}</span></a> : null)}</nav>
        <div style={{ marginTop: 44 }}><p className="mono-sm">{c.related}</p><div style={{ display: "grid", gap: 16, marginTop: 20 }}><Link href={`/${locale}/quality`} className="link-underline" style={{ width: "fit-content" }}>{c.quality} ↗</Link><Link href={`/${locale}/warehouse-quality`} className="link-underline" style={{ width: "fit-content" }}>{c.delivery} ↗</Link></div></div>
      </aside>
      <div className="g-start-6">{grouped.map((items, index) => {
        if (!items.length) return null;
        const itemStart = startIndex;
        startIndex += items.length;
        return <section key={c.groups[index]} id={`faq-${index}`} style={{ scrollMarginTop: 110, marginBottom: 48 }}><h2 className="h3" style={{ marginBottom: 24 }}>{c.groups[index]}</h2><FaqList faqs={items} locale={locale} startIndex={itemStart} /></section>;
      })}</div>
    </div></div></section>
    <InquiryCta pageKey="faq" locale={locale} secondary={{ label: dict.nav.contact, href: `/${locale}/contact` }} />
  </>;
}
