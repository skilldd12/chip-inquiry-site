"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Thin progress line that draws itself as the steps enter the viewport. */
export function StepFlow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const bar = root.querySelector<HTMLElement>(".step-line__progress");
      if (bar) bar.style.height = "100%";
      root.querySelectorAll<HTMLElement>(".step").forEach((el) => {
        el.dataset.inview = "true";
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const bar = root.querySelector<HTMLElement>(".step-line__progress");
      if (bar) {
        gsap.fromTo(
          bar,
          { height: "0%" },
          {
            height: "100%",
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 72%",
              end: "bottom 62%",
              scrub: 0.4,
            },
          }
        );
      }
      root.querySelectorAll<HTMLElement>(".step").forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 78%",
          once: true,
          onEnter: () => {
            step.dataset.inview = "true";
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className={`step-line ${className}`}>
      <div className="step-line__track" aria-hidden="true">
        <span className="step-line__progress" />
      </div>
      {children}
    </div>
  );
}
