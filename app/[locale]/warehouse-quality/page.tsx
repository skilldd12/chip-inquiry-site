import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPhoto } from "@/components/site/editorial-photo";
import { InnerHead, InquiryCta } from "@/components/site/editorial-layout";
import { ProcessGallery } from "@/components/site/process-gallery";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getMedia, getPageCopy } from "@/lib/editorial-media";
import { getSiteData, localizedField, metaFor } from "@/lib/site";

const content = {
  zh: { title: "每一次流转，都有依据。", lead: "从收货、标识存放到出库与发运，让型号、数量、批次和订单要求对应起来。", eyebrow: "仓储与交付", aside: "包装、存储条件、运输方式与随货资料，按器件要求及具体订单逐项确认。", process: "货物如何走向交付", processLead: "四个环节，对应四组操作场景。核对信息与货物流转一起前进。", storage: "标识与存储", storageBody: "按型号与批次标识、分区存放，避免混料。防潮包装与存储要求按器件及订单条件确认。", dispatch: "包装与发运", dispatchBody: "防静电包装、缓冲与外箱标识按订单安排。运输线路、目的地要求与随货资料在发运前明确。", prepare: "发运前，请说明", items: ["目的地与运输方式", "批次、包装与分批交付要求", "装箱信息及所需随货文件"], quality: "继续了解品质与追溯", qualityBody: "包装与标签核对、批次记录和异常处理，在品质页展开说明。", qualityLink: "查看品质流程" },
  en: { title: "A record behind every handover.", lead: "From receipt and labelled storage to outbound checks and dispatch, keep part numbers, quantities, date codes and order requirements together.", eyebrow: "Warehouse and delivery", aside: "Packaging, storage conditions, shipping method and accompanying documents are confirmed against the component and the order.", process: "The path to dispatch", processLead: "Four stages, each with its own working scene. Verified information moves with the goods.", storage: "Identification and storage", storageBody: "Label and separate parts by number and date code to avoid mixing. Confirm moisture protection and storage requirements against the component and order.", dispatch: "Packing and dispatch", dispatchBody: "Arrange ESD packaging, cushioning and outer labels for the order. Confirm the route, destination requirements and accompanying documents before dispatch.", prepare: "Please specify before dispatch", items: ["Destination and shipping method", "Date code, packaging and split-delivery requirements", "Packing details and accompanying documents"], quality: "Continue to quality and traceability", qualityBody: "The quality page explains packaging and label checks, lot records and exception handling.", qualityLink: "View the quality process" },
  ru: { title: "Каждая передача — с записью.", lead: "От приёмки и маркированного хранения до проверки перед отгрузкой — артикул, количество, дата-код и требования заказа остаются вместе.", eyebrow: "Склад и поставка", aside: "Упаковка, условия хранения, способ доставки и документы согласуются с учётом компонента и конкретного заказа.", process: "Путь к отправке", processLead: "Четыре этапа и соответствующие рабочие сцены. Проверенная информация сопровождает товар.", storage: "Маркировка и хранение", storageBody: "Компоненты маркируются и разделяются по артикулу и дата-коду. Требования к влагозащите и хранению согласуются с учётом компонента и заказа.", dispatch: "Упаковка и отправка", dispatchBody: "Антистатическая упаковка, амортизация и внешняя маркировка организуются по заказу. Маршрут, требования получателя и документы уточняются до отправки.", prepare: "Укажите до отправки", items: ["Место назначения и способ доставки", "Требования к дата-коду, упаковке и частичным поставкам", "Упаковочные сведения и сопроводительные документы"], quality: "Качество и прослеживаемость", qualityBody: "Проверки упаковки и маркировки, записи партий и работа с отклонениями описаны на странице качества.", qualityLink: "Процесс проверки качества" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = getPageCopy("warehouse-quality", locale, content[locale].title, content[locale].lead);
  return { ...metaFor("/warehouse-quality", locale, { title: c.title, description: c.lead }), alternates: { canonical: `/${locale}/warehouse-quality` } };
}

export default async function WarehousePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "zh";
  const dict = getDictionary(locale);
  const c = content[locale];
  const page = getPageCopy("warehouse-quality", locale, c.title, c.lead);
  const { warehouseItems } = getSiteData();
  const photos = ["receiving", "dry-storage", "traceability", "packing"];
  const steps = warehouseItems.slice(0, 4).map((item, index) => ({
    title: index === 1 ? c.storage : localizedField(item as unknown as Record<string, unknown>, "title", locale),
    body: index === 1 ? c.storageBody : localizedField(item as unknown as Record<string, unknown>, "body", locale),
    ...getMedia(photos[index], locale),
  }));
  return <>
    <InnerHead locale={locale} eyebrow={c.eyebrow} title={page.title} lead={page.lead} breadcrumbs={[{ label: c.eyebrow }]} aside={<><p>{c.aside}</p><Link href="#dispatch" className="link-underline" style={{ marginTop: 16 }}>{c.dispatch} ↓</Link></>} />
    <div className="container"><EditorialPhoto mediaKey={page.imageKey || "warehouse"} locale={locale} className="u-photo--wide" priority /></div>
    <section className="u-section" style={{ borderTop: 0 }}><div className="container">
      <div className="u-head"><div><p className="eyebrow">{c.eyebrow}</p><h2>{c.process}</h2></div><p>{c.processLead}</p></div>
      {steps.length ? <ProcessGallery steps={steps} label={c.process} /> : null}
    </div></section>
    <section className="u-section u-section--white" id="dispatch" style={{ scrollMarginTop: 100 }}><div className="container"><div className="u-split">
      <div className="u-copy"><p className="eyebrow">04 / {c.dispatch}</p><h2 className="u-title">{c.dispatch}</h2><p className="body">{c.dispatchBody}</p><p className="mono-sm">{c.prepare}</p><ul style={{ marginTop: 18 }}>{c.items.map(item => <li key={item} className="body" style={{ paddingBlock: 12, borderTop: "1px solid var(--line)", fontSize: 13 }}>{item}</li>)}</ul></div>
      <EditorialPhoto mediaKey="packing" locale={locale} />
    </div></div></section>
    <section className="u-section"><div className="container"><div className="u-split">
      <EditorialPhoto mediaKey="inspection" locale={locale} />
      <div className="u-copy"><p className="eyebrow">{locale === "zh" ? "关联流程" : locale === "ru" ? "Связанный процесс" : "Connected process"}</p><h2 className="u-title">{c.quality}</h2><p className="body">{c.qualityBody}</p><Link href={`/${locale}/quality`} className="link-underline">{c.qualityLink} ↗</Link></div>
    </div></div></section>
    <InquiryCta pageKey="warehouse-quality" locale={locale} secondary={{ label: dict.nav.capabilities, href: `/${locale}/capabilities` }} />
  </>;
}
