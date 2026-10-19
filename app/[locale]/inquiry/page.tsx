import type { Metadata } from "next";
import { Suspense } from "react";
import { InquiryScreen } from "@/components/site/inquiry-screen";
import { PageHead } from "@/components/site/page-head";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { metaFor } from "@/lib/site";
import { editorialCategories, industries, serviceStories, localized, pick, type Localized } from "@/lib/editorial";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const meta = metaFor("/inquiry", locale, {
    title: dict.inquiry.title,
    description: dict.inquiry.lead,
  });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${locale}/inquiry` },
    robots: { index: true, follow: true },
  };
}

export default async function InquiryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "zh") as Locale;
  const dict = getDictionary(locale);

  /* 查询串由客户端读取（见 InquiryScreen）：`await searchParams` 会把整页变成动态渲染，
     静态导出就预渲染不了这一页。这里只把"可选项"编译成纯数据传下去。 */
  const toOptions = (records: { slug: string; title: Localized }[]) =>
    records.map((item) => ({ slug: item.slug, title: localized(locale, item.title) }));

  return (
    <>
      <PageHead eyebrow={dict.inquiry.eyebrow} title={dict.inquiry.title} lead={dict.inquiry.lead} />

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <Suspense fallback={null}>
            <InquiryScreen
              locale={locale}
              labels={{
                category: pick(locale, "类别", "Category", "Категория"),
                service: pick(locale, "采购服务", "Service", "Услуга"),
                industry: pick(locale, "应用方向", "Application", "Применение"),
                context: pick(locale, "本次询价方向", "Your inquiry context", "Контекст запроса"),
              }}
              options={{
                category: toOptions(editorialCategories),
                service: toOptions(serviceStories),
                industry: toOptions(industries),
              }}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}
