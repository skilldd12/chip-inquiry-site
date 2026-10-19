"use client";

import Link from "next/link";
import { useRef, type ReactNode, type PointerEvent } from "react";

type Props = {
  href?: string;
  children: ReactNode;
  className?: string;
  strength?: number;
  ariaLabel?: string;
  onClick?: () => void;
};

/**
 * Magnetic affordance: the control drifts 3–5px toward the pointer.
 * Keyboard focus and the hit area never move (the transform is visual only).
 */
export function MagneticButton({
  href,
  children,
  className = "btn btn--primary",
  strength = 5,
  ariaLabel,
  onClick,
}: Props) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const frame = useRef(0);

  const onMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const dx = ((event.clientX - rect.left) / rect.width - 0.5) * strength * 2;
    const dy = ((event.clientY - rect.top) / rect.height - 0.5) * strength * 2;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
    });
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.transform = "translate(0, 0)";
  };

  const content = (
    <>
      <span>{children}</span>
      <span className="btn__arrow" aria-hidden="true">
        →
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        ref={ref}
        href={href}
        className={className}
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onBlur={reset}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerMove={onMove as unknown as (e: PointerEvent<HTMLButtonElement>) => void}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {content}
    </button>
  );
}
