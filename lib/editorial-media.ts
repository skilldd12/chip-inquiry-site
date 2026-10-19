import type { Locale } from "./i18n";
import { cache } from "react";
import { getSiteData } from "./site";
import { parseEditorialConfig } from "./editorial-config";

const descriptions: Record<string, [string, string, string]> = {
  warehouse: ["元器件存储区域与防潮柜", "Component storage and dry cabinets", "Хранение компонентов и сухие шкафы"],
  "dry-storage": ["防潮柜中的料盘与密封包装", "Trays and moisture barrier packaging in dry storage", "Лотки и влагозащитная упаковка"],
  receiving: ["收货时核对元器件包装与标签", "Checking component packaging and labels at receipt", "Проверка упаковки и маркировки при приёмке"],
  packing: ["元器件防静电包装与发运准备", "ESD packaging and shipment preparation", "Антистатическая упаковка и подготовка к отправке"],
  inspection: ["元器件外观检查工作台", "A component visual inspection workstation", "Рабочее место визуального контроля"],
  traceability: ["料盘与批次标识核对", "Tray and lot identification checks", "Проверка идентификации лотков и партий"],
  team: ["采购与客户需求协作场景", "Collaboration on procurement requirements", "Совместная работа по закупочным требованиям"],
  bom: ["BOM 清单与元器件核对场景", "Reviewing a BOM alongside component packaging", "Сверка BOM и упаковки компонентов"],
  "category-processors": ["BGA 处理器封装", "BGA processor packages", "Процессоры в корпусах BGA"],
  "category-memory": ["存储器件封装", "Memory packages", "Корпуса микросхем памяти"],
  "category-power": ["电源与功率器件", "Power management and power devices", "Компоненты управления питанием"],
  "category-analog": ["模拟与接口器件", "Analog and interface devices", "Аналоговые и интерфейсные компоненты"],
  "category-connectors": ["连接器器件", "Electronic connectors", "Электронные соединители"],
  "category-passives": ["电阻、电容与电感", "Resistors, capacitors and inductors", "Резисторы, конденсаторы и дроссели"],
  "industry-industrial": ["工业控制应用场景", "Industrial control application", "Промышленное управление"],
  "industry-network": ["通信与网络设备场景", "Telecom and networking equipment", "Телекоммуникационное и сетевое оборудование"],
  "industry-energy": ["能源与电源应用场景", "Energy and power application", "Энергетика и силовая электроника"],
  "industry-automotive": ["汽车电子应用场景", "Automotive electronics application", "Автомобильная электроника"],
};
const local = (locale: Locale, values: [string, string, string]) => values[locale === "zh" ? 0 : locale === "en" ? 1 : 2];
const settings = cache(() => parseEditorialConfig((getSiteData().config as unknown as { editorial?: unknown }).editorial));

export function getMedia(key: string, locale: Locale) {
  const media = settings().media[key];
  const legacyWarehouse = key === "warehouse" ? getSiteData().config.media.warehouse : "";
  const description = descriptions[key] || descriptions.warehouse;
  return {
    src: media?.src || (legacyWarehouse && !legacyWarehouse.endsWith("/warehouse-01.jpg") ? legacyWarehouse : "") || `/images/editorial/${descriptions[key] ? key : "warehouse"}.webp`,
    alt: media?.alt?.[locale] || local(locale, description),
    caption: media?.caption?.[locale] || (media?.kind === "photo" ? "" : local(locale, ["AI 场景示意", "AI scene illustration", "Иллюстративная сцена, ИИ"])),
    position: media?.position || "50% 50%",
    kind: media?.kind || "illustrative" as const,
    source: media?.source || "AI-generated editorial image",
  };
}

export function getPageCopy(key: string, locale: Locale, fallbackTitle: string, fallbackLead: string) {
  const page = settings().pages[key];
  return {
    title: page?.title?.[locale] || fallbackTitle,
    lead: page?.lead?.[locale] || fallbackLead,
    imageKey: page?.imageKey || undefined,
    relatedBrands: page?.relatedBrands || [],
    relatedCategories: page?.relatedCategories || [],
  };
}
