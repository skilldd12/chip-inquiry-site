"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Step = { title: string; body: string; src: string; alt: string; caption: string; position: string };
export function ProcessGallery({ steps, label }: { steps: Step[]; label: string }) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 900) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible[0]) setActive(Number((visible[0].target as HTMLElement).dataset.step));
    }, { rootMargin: "-25% 0px -40% 0px", threshold: 0 });
    root.current?.querySelectorAll("[data-step]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  if (steps.length === 0) return null;
  const current = Math.min(active, steps.length - 1);
  return <div className="u-process" ref={root}>
    <div className="u-process__visual">
      <div className="u-process__images">{steps.map((step, index) => <Image key={step.src} src={step.src} alt={index === current ? step.alt : ""} aria-hidden={index !== current} fill sizes="(max-width: 900px) 100vw, 55vw" className={index === current ? "is-active" : ""} style={{ objectFit: "cover", objectPosition: step.position }} />)}</div>
      <div className="u-process__caption"><span>{String(current + 1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")}</span><span>{steps[current].caption}</span></div>
    </div>
    <div className="u-process__steps" aria-label={label}>{steps.map((step, index) => <div data-step={index} key={step.title} className={`u-process__step ${current === index ? "is-active" : ""}`}>
      <button type="button" onClick={() => setActive(index)} aria-pressed={current === index}><span className="mono">{String(index + 1).padStart(2,"0")}</span><h3>{step.title}</h3><span aria-hidden="true">↗</span></button><p>{step.body}</p>
    </div>)}</div>
  </div>;
}
