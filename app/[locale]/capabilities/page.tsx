import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EditorialPhoto } from "@/components/site/editorial-photo";
import { InnerHead, InquiryCta } from "@/components/site/editorial-layout";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getPageCopy } from "@/lib/editorial-media";
import { getSiteData, localizedField, metaFor } from "@/lib/site";

const content = {
  zh: { title: "从找料，到配齐。", lead: "按型号核对供货，按 BOM 整理需求。让品牌、批次、包装与交付条件在报价前逐项明确。", aside: "型号与数量是起点。品牌、封装、批次偏好、目标交期及所需文件，让寻源更有依据。", services: "按采购需求，找到服务", servicesLead: "单个型号、多行 BOM、供货变更与订单交付，都有对应的处理路径。", process: "一份需求，三个确认点", steps: ["明确输入", "核对条件", "确认后执行"], bodies: ["提交型号和数量，附上 BOM、封装、批次或交期要求。", "逐项核对可供性、包装、报价条件与所需资料，单独说明替代选项。", "你方确认报价与替代方案后，衔接配货、复核、包装与发运。"], note: "经营范围不等于即时库存。可供性、价格、起订量及交期，以具体型号的确认结果为准。", quality: "品质与追溯", products: "浏览产品类别" },
  en: { title: "From sourcing to a complete BOM.", lead: "Check supply by part number. Organise requirements by BOM. Clarify brand, date code, packaging and delivery terms before quotation.", aside: "Start with part numbers and quantities. Brand, package, date-code preferences, target timing and required documents give sourcing a clear basis.", services: "Services around the requirement", servicesLead: "Single parts, multi-line BOMs, supply changes and order delivery each have a practical path.", process: "Three points of confirmation", steps: ["Define the input", "Check the terms", "Confirm and execute"], bodies: ["Send part numbers and quantities with a BOM, package, date-code or timing requirements.", "Check availability, packaging, quotation terms and documents line by line. Present alternatives separately.", "After you approve the quotation and any alternatives, move into picking, verification, packing and dispatch."], note: "Sourcing range does not indicate live stock. Availability, price, MOQ and timing are confirmed for the specific part.", quality: "Quality and traceability", products: "Explore component categories" },
  ru: { title: "От поиска к полной комплектации.", lead: "Проверяем поставку по артикулу, упорядочиваем требования по BOM. Бренд, дата-код, упаковка и условия поставки уточняются до предложения.", aside: "Начните с артикула и количества. Бренд, корпус, дата-код, сроки и необходимые документы помогают точнее определить запрос.", services: "Услуги под задачу закупки", servicesLead: "Для отдельных позиций, многострочного BOM, изменений поставки и отгрузки предусмотрены свои этапы работы.", process: "Три этапа согласования", steps: ["Определить исходные данные", "Проверить условия", "Согласовать и исполнить"], bodies: ["Укажите артикулы и количество, приложите BOM и требования к корпусу, дата-коду или срокам.", "Построчно уточняем наличие, упаковку, условия цены и документы. Аналоги указываем отдельно.", "После согласования предложения и аналогов переходим к отбору, проверке, упаковке и отправке."], note: "Диапазон поиска не означает наличие на складе. Наличие, цена, минимум заказа и сроки подтверждаются для конкретной позиции.", quality: "Качество и прослеживаемость", products: "Категории компонентов" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = getPageCopy("capabilities", locale, content[locale].title, content[locale].lead);
  return { ...metaFor("/capabilities", locale, { title: c.title, description: c.lead }), alternates: { canonical: `/${locale}/capabilities` } };
}

export default async function CapabilitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "zh";
  const dict = getDictionary(locale);
  const c = content[locale];
  const page = getPageCopy("capabilities", locale, c.title, c.lead);
  const { services } = getSiteData();
  return <>
    <InnerHead locale={locale} eyebrow={dict.capabilities.eyebrow} title={page.title} lead={page.lead} breadcrumbs={[{ label: dict.nav.capabilities }]} aside={<p>{c.aside}</p>} />
    <div className="container"><EditorialPhoto mediaKey={page.imageKey || "bom"} locale={locale} className="u-photo--wide" priority /></div>
    <section className="u-section" style={{ borderTop: 0 }}><div className="container">
      <div className="u-head"><div><p className="eyebrow">{dict.capabilities.servicesTitle}</p><h2>{c.services}</h2></div><p>{c.servicesLead}</p></div>
      <div className="u-service-list">{services.map((service, index) => <Link href={`/${locale}/capabilities/${service.slug}`} key={service.slug}>
        <span className="mono">{String(index + 1).padStart(2, "0")}</span>
        <h3>{localizedField(service as unknown as Record<string, unknown>, "title", locale)}</h3>
        <p>{localizedField(service as unknown as Record<string, unknown>, "body", locale)}</p><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>)}</div>
    </div></section>
    <section className="u-section u-section--white"><div className="container">
      <div className="u-head"><div><p className="eyebrow">{dict.capabilities.processTitle}</p><h2>{c.process}</h2></div><p>{c.note}</p></div>
      <div className="u-mini-grid">{c.steps.map((title, index) => <div key={title}><span className="mono">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{c.bodies[index]}</p></div>)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 30, marginTop: 40 }}><Link className="link-underline" href={`/${locale}/products`}>{c.products} ↗</Link><Link className="link-underline" href={`/${locale}/quality`}>{c.quality} ↗</Link></div>
    </div></section>
    <InquiryCta pageKey="capabilities" locale={locale} secondary={{ label: dict.nav.contact, href: `/${locale}/contact` }} />
  </>;
}
