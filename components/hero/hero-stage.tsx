"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getDictionary, type Locale } from "@/lib/i18n";
import { ChipCanvas } from "./chip-canvas";
import "./hero.css";

type Props = { locale: Locale; inquiryHref: string; capabilitiesHref: string; heading?: string; description?: string };
export function HeroStage({ locale, inquiryHref, capabilitiesHref, heading, description }: Props) {
  const dict = getDictionary(locale);
  const titleLines = heading ? heading.split("\n").filter(Boolean) : dict.home.titleLines;
  const root = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null), title = useRef<HTMLHeadingElement>(null);
  const progress = useRef(0), pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const section = root.current, panel = stage.current;
    if (!section || !panel) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const update = (p: number) => {
      progress.current = p;
      panel.style.setProperty("--journey", `${p * 100}%`);
      document.documentElement.dataset.hero = "bright";
    };
    update(0);
    mm.add({ desktop: "(min-width: 820px)", mobile: "(max-width: 819px)", reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
      update(0);
      if (context.conditions?.reduced) { update(0); return; }
      const desktop = context.conditions?.desktop;
      const trigger = ScrollTrigger.create({ trigger: section, pin: desktop ? panel : false, start: "top top", end: desktop ? () => `+=${window.innerHeight * 1.35}` : "bottom top", anticipatePin: desktop ? 1 : 0, invalidateOnRefresh: true, onUpdate: (self) => update(desktop ? self.progress : self.progress * 0.35) });
      return () => trigger.kill();
    });
    const context = gsap.context(() => {
      if (!motion.matches) gsap.from(".chip-hero__copy > *", { y: 12, duration: 0.8, stagger: 0.035, ease: "power3.out", clearProps: "transform" });
    }, section);
    let raf = 0, mouseX = 0, mouseY = 0;
    const paint = () => {
      raf = 0;
      const heading = title.current;
      if (!heading) return;
      const box = heading.getBoundingClientRect();
      heading.style.setProperty("--mouse-x", `${mouseX - box.left}px`);
      heading.style.setProperty("--mouse-y", `${mouseY - box.top}px`);
    };
    const primary = panel.querySelector<HTMLElement>(".chip-hero__primary");
    const move = (event: PointerEvent) => {
      if (motion.matches || event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
      mouseX = event.clientX; mouseY = event.clientY;
      if (primary) {
        const rect = primary.getBoundingClientRect();
        const inside = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
        primary.style.setProperty("--magnet-x", inside ? `${(mouseX - rect.left - rect.width / 2) * 0.06}px` : "0px");
        primary.style.setProperty("--magnet-y", inside ? `${(mouseY - rect.top - rect.height / 2) * 0.12}px` : "0px");
      }
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const leave = () => {
      pointer.current.x = pointer.current.y = 0;
      primary?.style.setProperty("--magnet-x", "0px"); primary?.style.setProperty("--magnet-y", "0px");
      title.current?.style.setProperty("--mouse-x", "-300px");
    };
    const fallback = () => {
      mm.revert(); update(0);
      section.dataset.fallback = "true"; panel.dataset.fallback = "true";
      ScrollTrigger.refresh();
    };
    panel.addEventListener("pointermove", move, { passive: true }); panel.addEventListener("pointerleave", leave);
    panel.addEventListener("chip-scene-unavailable", fallback);
    return () => {
      mm.revert(); context.revert(); panel.removeEventListener("pointermove", move); panel.removeEventListener("pointerleave", leave);
      panel.removeEventListener("chip-scene-unavailable", fallback);
      cancelAnimationFrame(raf); delete document.documentElement.dataset.hero;
    };
  }, []);
  return (
    <section className="hero chip-hero" ref={root} data-locale={locale} aria-labelledby="hero-title">
      <div className="hero__stage chip-hero__stage" ref={stage}>
        <div className="chip-hero__poster" aria-hidden="true" />
        <ChipCanvas progress={progress} pointer={pointer} />
        <div className="chip-hero__reading-light" aria-hidden="true" />
        <div className="chip-hero__copy container">
          <p className="chip-hero__eyebrow">{dict.home.eyebrow}</p>
          <h1 id="hero-title" className="chip-hero__title" ref={title}>{titleLines.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="chip-hero__description">{description || dict.home.subtitle}</p>
          <div className="chip-hero__actions">
            <Link className="chip-hero__primary" href={inquiryHref}><span>{dict.nav.inquiry}</span><ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
            <Link className="chip-hero__secondary" href={capabilitiesHref}>{dict.common.learnMore}<ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="chip-hero__progress" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
