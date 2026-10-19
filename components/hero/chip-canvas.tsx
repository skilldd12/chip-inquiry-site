"use client";
import { useEffect, useRef, useState } from "react";
type Props = { progress: { current: number }; pointer: { current: { x: number; y: number } } };
export function ChipCanvas({ progress, pointer }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const element = host.current;
    if (!element || reduced === null) return;
    element.dataset.scene = "loading";
    const fallback = (notify = true) => {
      if (disposed) return;
      cleanup?.(); cleanup = undefined;
      element.dataset.scene = "fallback";
      element.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
      if (notify) element.dispatchEvent(new CustomEvent("chip-scene-unavailable", { bubbles: true }));
    };
    const lost = () => { if (element.dataset.scene !== "fallback") fallback(false); };
    element.addEventListener("chip-scene-unavailable", lost);
    import("./chip-scene").then(({ createChipScene }) => {
      if (disposed) return;
      try { cleanup = createChipScene(element, { progress, pointer, reduced }); }
      catch (error) { fallback(); console.warn("Cinematic scene unavailable; showing its still image.", error); }
    }).catch(() => { if (!disposed) fallback(); });
    return () => { disposed = true; element.removeEventListener("chip-scene-unavailable", lost); cleanup?.(); };
  }, [progress, pointer, reduced]);
  return <div className="chip-hero__scene" ref={host} aria-hidden="true" />;
}
