"use client";

import { useSearchParams } from "next/navigation";
import { InquiryForm } from "@/components/site/inquiry-form";
import type { Locale } from "@/lib/i18n";

type Option = { slug: string; title: string };

/**
 * 询价页的客户端外壳：只做一件事 —— 把 URL 查询串（品牌 / 型号 / 类目 / 服务 / 行业）读出来填进表单。
 *
 * 为什么不在页面上读：`await searchParams` 会把整个页面变成动态渲染，
 * 这样静态导出（GitHub Pages）就没法预渲染这一页了。查询串本来只在浏览器里才有意义，
 * 放到客户端读，页面仍然是静态的，Node 版和静态版行为一致。
 */
export function InquiryScreen({
  locale,
  labels,
  options,
}: {
  locale: Locale;
  labels: { category: string; service: string; industry: string; context: string };
  options: { category: Option[]; service: Option[]; industry: Option[] };
}) {
  const query = useSearchParams();
  const value = (key: string) => (query.get(key) || "").trim().slice(0, 160);

  const lines = (
    [
      [labels.category, value("category"), options.category],
      [labels.service, value("service"), options.service],
      [labels.industry, value("industry"), options.industry],
    ] as const
  )
    .filter(([, raw]) => raw)
    .map(([label, raw, records]) => {
      const match = records.find((item) => item.slug === raw);
      return `${label}: ${match ? match.title : raw}`;
    });

  const brand = value("brand");
  const mpn = value("mpn");
  const initialMessage = lines.join("\n");

  return (
    <>
      {lines.length ? (
        <p className="u-inquiry-context">
          {labels.context}: {lines.join(" · ")}
        </p>
      ) : null}
      <InquiryForm
        key={`${brand}|${mpn}|${initialMessage}`}
        locale={locale}
        initialBrand={brand}
        initialMpn={mpn}
        initialMessage={initialMessage}
      />
    </>
  );
}
