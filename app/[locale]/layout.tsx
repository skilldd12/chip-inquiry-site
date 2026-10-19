import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import "@/components/site/upgrade.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  SITE_URL,
  absoluteUrl,
  getDictionary,
  htmlLang,
  isLocale,
  locales,
  type Locale,
} from "@/lib/i18n";
import { getSiteData } from "@/lib/site";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["400", "500"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const { config } = getSiteData();
  const siteName = locale === "zh" ? config.company.name_zh : config.company.name_en;

  const languages: Record<string, string> = {};
  for (const l of locales) languages[htmlLang[l]] = `/${l}`;
  languages["x-default"] = `/${locales[0]}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteName} — ${dict.meta.tagline}`,
      template: `%s — ${siteName}`,
    },
    description: dict.meta.defaultDescription,
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} — ${dict.meta.tagline}`,
      description: dict.meta.defaultDescription,
      url: absoluteUrl(`/${locale}`),
      locale: locale === "zh" ? "zh_CN" : locale === "ru" ? "ru_RU" : "en_US",
      images: [{ url: "/images/bga-chip-poster.png", alt: "BGA semiconductor package" }],
    },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const { config } = getSiteData();
  const siteName = locale === "zh" ? config.company.name_zh : config.company.name_en;
  const suffix = locale === "zh" ? "COMPONENTS" : locale === "ru" ? "КОМПОНЕНТЫ" : "元器件";

  return (
    <html lang={htmlLang[locale]} className={`${inter.variable} ${plex.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={locale} name={siteName} suffix={suffix} />
        <main id="main">{children}</main>
        <SiteFooter
          locale={locale}
          company={config.company}
          siteName={siteName}
          brandPrefix={locale === "zh" ? config.company.short_zh : config.company.short_en}
        />
      </body>
    </html>
  );
}
