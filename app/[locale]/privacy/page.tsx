import type { Metadata } from "next";
import { PageHead } from "@/components/site/page-head";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSiteData, metaFor } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const meta = metaFor("/privacy", locale, {
    title: dict.legal.privacyTitle,
    description: dict.legal.privacyLead,
  });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${locale}/privacy` },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "zh") as Locale;
  const dict = getDictionary(locale);
  const { config } = getSiteData();

  return (
    <>
      <PageHead
        eyebrow={dict.footer.legal}
        title={dict.legal.privacyTitle}
        lead={dict.legal.privacyLead}
        tone="h2"
        aside={
          <p className="mono" style={{ marginTop: 14 }}>
            {locale === "zh" ? "更新于" : locale === "ru" ? "Обновлено" : "Updated"}{" "}
            {config.legal.updated}
          </p>
        }
      />
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid12">
            <div className="g-7">
              {dict.legal.privacySections.map((section, index) => (
                <article key={section.title} style={{ marginBottom: 30 }}>
                  <p className="mono" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="h3" style={{ marginTop: 8 }}>
                    {section.title}
                  </h2>
                  <p className="body" style={{ marginTop: 8, maxWidth: "64ch" }}>
                    {section.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
