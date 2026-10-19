import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { getMedia } from "@/lib/editorial-media";

export function EditorialPhoto({ mediaKey, locale, className = "", priority = false }: { mediaKey: string; locale: Locale; className?: string; priority?: boolean }) {
  const media = getMedia(mediaKey, locale);
  const sizes = className.includes("wide") ? "100vw" : mediaKey.startsWith("category-") ? "(max-width: 900px) 50vw, 34vw" : mediaKey.startsWith("industry-") ? "(max-width: 900px) 50vw, 25vw" : "(max-width: 900px) 100vw, 55vw";
  return <figure className={`u-photo ${className}`}>
    <div className="u-photo__image"><Image src={media.src} alt={media.alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: media.position }} /></div>
    {media.caption ? <figcaption>{media.caption}</figcaption> : null}
  </figure>;
}
