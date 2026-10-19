"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { Brand } from "@/lib/site";
import type { Dictionary, Locale } from "@/lib/i18n";

const detailedBrands = new Set(["ti", "adi", "st", "nxp", "infineon", "amd", "micron", "samsung"]);
const categoryLabels: Record<string, [string, string]> = {
  "模拟与放大器": ["Analog & amplifiers", "Аналоговые схемы"], "电源管理": ["Power management", "Питание"],
  "MCU与处理器": ["MCUs & processors", "MCU и процессоры"], "存储": ["Memory", "Память"],
  "接口与隔离": ["Interface & isolation", "Интерфейсы"], "射频": ["RF & wireless", "Радиочастотные"],
  "连接器": ["Connectors", "Соединители"], "被动元件": ["Passive components", "Пассивные"],
  "分立半导体": ["Discrete devices", "Дискретные"], "传感器": ["Sensors", "Датчики"],
  "逻辑与时钟": ["Logic & timing", "Логика и тактирование"], "光电": ["Optoelectronics", "Оптоэлектроника"],
};

export function BrandIndex({
  brands,
  locale,
  inquiryBase,
  dict,
  compact = false,
}: {
  brands: Brand[];
  locale: Locale;
  inquiryBase: string;
  dict: Dictionary;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");
  const [category, setCategory] = useState("");
  const letters = Array.from(new Set(brands.map(b => b.name[0].toUpperCase()))).sort();
  const categories = Array.from(new Set(brands.flatMap(b => b.categories.split(",").filter(Boolean))));
  const categoryName = (name: string) => locale === "zh" ? name : categoryLabels[name]?.[locale === "en" ? 0 : 1] || name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter(
      (b) =>
        (!q || b.name.toLowerCase().includes(q) ||
        b.legal_name.toLowerCase().includes(q) ||
        b.categories.toLowerCase().includes(q)) &&
        (!letter || b.name[0].toUpperCase() === letter) &&
        (!category || b.categories.split(",").includes(category))
    );
  }, [brands, query, letter, category]);

  const countLabel = dict.brands.countLabel.replace("{count}", String(filtered.length));

  return (
    <div>
      {!compact ? (
        <div>
        <div
          className="flex flex-wrap items-end justify-between gap-4"
          style={{ marginBottom: 22 }}
        >
          <label className="field" style={{ maxWidth: 340, width: "100%" }}>
            <span className="mono-sm">{dict.brands.searchLabel}</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dict.brands.searchPlaceholder}
              autoComplete="off"
            />
          </label>
          <label className="field" style={{ maxWidth: 260, width: "100%" }}>
            <span className="mono-sm">{locale === "zh" ? "器件类别" : locale === "ru" ? "Категория" : "Component category"}</span>
            <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{locale === "zh" ? "全部类别" : locale === "ru" ? "Все категории" : "All categories"}</option>
              {categories.map(item => <option key={item} value={item}>{categoryName(item)}</option>)}
            </select>
          </label>
          <p className="mono" aria-live="polite">
            {countLabel}
          </p>
        </div>
        <div className="u-brand-letters" role="group" aria-label={locale === "zh" ? "按品牌首字母筛选" : locale === "ru" ? "Фильтр по букве" : "Filter manufacturers by initial"}>
          {["", ...letters].map(value => <button type="button" key={value} aria-pressed={letter === value} onClick={() => setLetter(value)}>{value || (locale === "zh" ? "全部" : locale === "ru" ? "Все" : "All")}</button>)}
        </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="panel" style={{ padding: 28 }}>
          <p className="body">{dict.brands.empty}</p>
          <Link href={inquiryBase} className="link-underline" style={{ marginTop: 14 }}>
            {dict.nav.inquiry}
          </Link>
        </div>
      ) : (
        <ul className="brand-grid">
          {filtered.map((brand, index) => (
            <li className="brand-cell" key={brand.slug}>
              <div className="flex items-start justify-between gap-3">
                <span className="mono" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 26 }}>
                <Link
                  href={detailedBrands.has(brand.slug) ? `/${locale}/brands/${brand.slug}` : `${inquiryBase}?brand=${encodeURIComponent(brand.name)}`}
                  className={`brand-cell__mark${brand.logo_key ? " brand-cell__mark--logo" : " brand-cell__mark--text"}`}
                  aria-label={detailedBrands.has(brand.slug) ? `${brand.name} — ${locale === "zh" ? "品牌详情" : locale === "ru" ? "О бренде" : "Brand details"}` : dict.brands.askAria.replace("{brand}", brand.name)}
                >
                  {brand.logo_key ? (
                    <Image
                      className="brand-cell__logo"
                      src={brand.logo_key}
                      alt={brand.name}
                      width={148}
                      height={42}
                      unoptimized
                    />
                  ) : (
                    /* 没有官方图形标志的品牌就用自家字体写全名，不做大写假字标 */
                    <span className="brand-cell__name">{brand.name}</span>
                  )}
                </Link>
                <div className="brand-cell__meta" style={{ marginTop: 12 }}>
                  <span className="mono" style={{ fontSize: 10.5 }}>
                    {locale === "zh" ? brand.categories.split(",")[0] : categoryLabels[brand.categories.split(",")[0]]?.[locale === "en" ? 0 : 1] || brand.categories.split(",")[0]}
                  </span>
                  <Link href={`${inquiryBase}?brand=${encodeURIComponent(brand.name)}`} className="brand-cell__ask" aria-label={dict.brands.askAria.replace("{brand}", brand.name)}>{dict.brands.ask} →</Link>
                </div>
              </div>
            </li>
          ))}

          {!compact ? (
            <li className="brand-cell brand-cell--ask">
              <Link href={inquiryBase} className="brand-cell__asklink">
                <span className="mono" aria-hidden="true">
                  +
                </span>
                <span className="brand-cell__name">{dict.brands.askAny}</span>
                <span className="brand-cell__ask">{dict.brands.askAnyCta} →</span>
              </Link>
            </li>
          ) : null}
        </ul>
      )}

      {!compact ? (
        <p className="small" style={{ marginTop: 20, maxWidth: "78ch" }}>
          {dict.brands.note}
        </p>
      ) : null}
    </div>
  );
}
