"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Wide image that unclips on entry and drifts slightly with scroll.
 * Pre-rendered photography plus a 2D parallax — not a 3D scene.
 */
export function ParallaxFigure({
  src,
  alt,
  caption,
  aspect = "16 / 7",
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  aspect?: string;
  priority?: boolean;
}) {
  const wrapRef = useRef<HTMLElement | null>(null);
  const imgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrap.dataset.inview = "true";
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        wrap,
        { clipPath: "inset(0% 0% 100% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: wrap, start: "top 86%", once: true },
          onStart: () => {
            wrap.dataset.inview = "true";
          },
        }
      );
      if (imgRef.current) {
        gsap.fromTo(
          imgRef.current,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
          }
        );
      }
    }, wrap);
    return () => ctx.revert();
  }, []);

  return (
    <figure ref={wrapRef} style={{ margin: 0, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", aspectRatio: aspect, overflow: "hidden", background: "#e9ebed" }}>
        <div ref={imgRef} style={{ position: "absolute", inset: "-6% 0" }}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            priority={priority}
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
      {caption ? (
        <figcaption className="mono-sm" style={{ marginTop: 10 }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
