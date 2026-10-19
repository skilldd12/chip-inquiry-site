import type { Dictionary, Locale } from "./i18n";

export type NavKey = keyof Dictionary["nav"];

export type NavItem = { key: "home" | "brands" | "capabilities" | "quality" | "about" | "contact"; path: string };

export const NAV_ITEMS: NavItem[] = [
  { key: "home", path: "" },
  { key: "brands", path: "brands" },
  { key: "capabilities", path: "capabilities" },
  { key: "quality", path: "warehouse-quality" },
  { key: "about", path: "about" },
  { key: "contact", path: "contact" },
];

export const FOOTER_LINKS = [
  { key: "faq", path: "faq" },
  { key: "privacy", path: "privacy" },
  { key: "terms", path: "terms" },
];

export type NavLabel = [string, string, string];
export const navLabel = (label: NavLabel, locale: Locale) => label[locale === "zh" ? 0 : locale === "en" ? 1 : 2];
export const NAV_GROUPS: { label: NavLabel; path: string; links: { label: NavLabel; path: string }[] }[] = [
  { label: ["产品与品牌", "Components", "Компоненты"], path: "products", links: [
    { label: ["产品类别", "Product categories", "Категории"], path: "products" },
    { label: ["全部经营品牌", "All manufacturers", "Все бренды"], path: "brands" },
    { label: ["处理器与 FPGA", "Processors & FPGAs", "Процессоры и FPGA"], path: "products/mcu-processors" },
    { label: ["存储器件", "Memory", "Память"], path: "products/memory" },
  ] },
  { label: ["采购服务", "Sourcing", "Закупки"], path: "capabilities", links: [
    { label: ["服务总览", "Services overview", "Обзор услуг"], path: "capabilities" },
    { label: ["品牌寻源", "Component sourcing", "Поиск компонентов"], path: "capabilities/brand-sourcing" },
    { label: ["BOM 配单", "BOM sourcing", "Комплектация BOM"], path: "capabilities/bom-kitting" },
    { label: ["提交采购需求", "Request a quote", "Запросить предложение"], path: "inquiry" },
  ] },
  { label: ["仓储与品质", "Operations", "Операции"], path: "warehouse-quality", links: [
    { label: ["仓储与交付", "Storage & fulfillment", "Хранение и поставка"], path: "warehouse-quality" },
    { label: ["品质与追溯", "Quality & traceability", "Качество и прослеживаемость"], path: "quality" },
    { label: ["包装与发运", "Packing & dispatch", "Упаковка и отправка"], path: "warehouse-quality#dispatch" },
  ] },
  { label: ["行业应用", "Industries", "Отрасли"], path: "industries", links: [
    { label: ["应用方向", "Applications", "Применение"], path: "industries" },
    { label: ["工业自动化", "Industrial automation", "Автоматизация"], path: "industries/industrial" },
    { label: ["通信与网络", "Telecom & networks", "Связь и сети"], path: "industries/network" },
    { label: ["能源与电源", "Energy & power", "Энергетика"], path: "industries/energy" },
    { label: ["汽车电子", "Automotive electronics", "Автоэлектроника"], path: "industries/automotive" },
  ] },
  { label: ["关于我们", "Company", "Компания"], path: "about", links: [
    { label: ["公司介绍", "About us", "О компании"], path: "about" },
    { label: ["团队协作", "How we work", "Как мы работаем"], path: "about#team" },
    { label: ["联系我们", "Contact", "Контакты"], path: "contact" },
  ] },
  { label: ["资源中心", "Resources", "Материалы"], path: "resources", links: [
    { label: ["采购指南", "Procurement guides", "Руководства"], path: "resources" },
    { label: ["BOM 模板", "BOM template", "Шаблон BOM"], path: "resources/prepare-a-bom" },
    { label: ["常见问题", "FAQ", "Вопросы и ответы"], path: "faq" },
  ] },
];

export function navHref(locale: Locale, path: string) {
  return path ? `/${locale}/${path}` : `/${locale}`;
}

/** Strip the locale prefix so nav active state can be compared. */
export function stripLocale(pathname: string, locale: Locale): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length + 1);
  return pathname.replace(/^\//, "");
}

export function isActive(current: string, itemPath: string) {
  if (itemPath === "") return current === "";
  return current === itemPath || current.startsWith(`${itemPath}/`);
}
