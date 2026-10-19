"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { getDictionary, locales, type Locale } from "@/lib/i18n";
import { NAV_GROUPS, isActive, navHref, navLabel, stripLocale } from "@/lib/nav";

type Props = { locale: Locale; name: string; suffix: string };
export function SiteHeader({ locale, name, suffix }: Props) {
  const dict = getDictionary(locale), pathname = usePathname() || `/${locale}`, router = useRouter();
  const current = stripLocale(pathname, locale);
  const [open, setOpen] = useState(false), [active, setActive] = useState<number | null>(null);
  const header = useRef<HTMLElement>(null), drawer = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); setActive(null); }, [pathname]);
  useEffect(() => {
    const onOutside = (e: PointerEvent) => { if (!header.current?.contains(e.target as Node)) setActive(null); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const trigger = header.current?.querySelector<HTMLButtonElement>('.site-nav__trigger[aria-expanded="true"]');
      if (drawer.current) { setOpen(false); toggle.current?.focus(); }
      else if (trigger) { setActive(null); trigger.focus(); }
    };
    document.addEventListener("pointerdown", onOutside); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onOutside); document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("no-scroll");
    const panel = drawer.current;
    panel?.querySelector<HTMLElement>("button")?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href],button,summary')).filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    panel?.addEventListener("keydown", trap);
    return () => { document.body.classList.remove("no-scroll"); panel?.removeEventListener("keydown", trap); };
  }, [open]);
  const switchLocale = (next: Locale) => navHref(next, current);
  const carrySearch = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.search) { e.preventDefault(); router.push(e.currentTarget.pathname + window.location.search); setOpen(false); }
  };
  const groupActive = (index: number) => NAV_GROUPS[index].links.some(link => isActive(current, link.path.split("#")[0]));
  return <>
    <header ref={header} className="site-header site-header--editorial" data-solid="true">
      <div className="container site-header__inner">
        <Link href={navHref(locale, "")} className="wordmark" aria-label={name}><span>{name}</span><span className="wordmark__suffix">{suffix}</span></Link>
        <nav className="site-nav" aria-label={dict.nav.primary} onMouseLeave={() => setActive(null)}>
          {NAV_GROUPS.map((group, index) => <div className="site-nav__group" key={group.path} onMouseEnter={() => setActive(index)}>
            <button type="button" className="site-nav__trigger" aria-expanded={active === index} aria-controls={`nav-panel-${index}`} data-active={groupActive(index)} onClick={() => setActive(active === index ? null : index)}>{navLabel(group.label, locale)}<ChevronDown size={11} aria-hidden="true" /></button>
            <div id={`nav-panel-${index}`} className="site-nav__panel" hidden={active !== index}>
              <span className="mono-sm">{navLabel(group.label, locale)}</span>
              {group.links.map(link => <Link key={link.path} href={navHref(locale, link.path)} aria-current={isActive(current, link.path) ? "page" : undefined} onClick={() => setActive(null)}>{navLabel(link.label, locale)}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
            </div>
          </div>)}
        </nav>
        <div className="site-header__tools">
          <div className="locale-switch" role="group" aria-label={dict.nav.language}>{locales.map(l => <Link key={l} href={switchLocale(l)} hrefLang={l} data-active={l === locale} className="locale-switch__item" onClick={carrySearch}>{l === "zh" ? "中" : l.toUpperCase()}</Link>)}</div>
          <Link className="btn btn--primary btn--sm header-cta" href={navHref(locale, "inquiry")}>{dict.nav.inquiry}<ArrowUpRight size={13} aria-hidden="true" /></Link>
          <button type="button" ref={toggle} className="menu-toggle" aria-label={dict.nav.menu} aria-expanded={open} aria-controls="site-drawer" onClick={() => setOpen(true)}><Menu size={20} /></button>
        </div>
      </div>
    </header>
    {open ? <div id="site-drawer" className="editorial-drawer" role="dialog" aria-modal="true" aria-label={dict.nav.primary} ref={drawer}>
      <div className="editorial-drawer__head"><Link href={navHref(locale, "")} onClick={() => setOpen(false)} className="wordmark">{name}</Link><button type="button" aria-label={dict.nav.close} onClick={() => { setOpen(false); toggle.current?.focus(); }}><X size={23} /></button></div>
      {NAV_GROUPS.map(group => <details key={group.path}><summary>{navLabel(group.label, locale)}<ChevronDown size={16} /></summary><div>{group.links.map(link => <Link key={link.path} href={navHref(locale, link.path)} onClick={() => setOpen(false)}>{navLabel(link.label, locale)}<ArrowUpRight size={14} /></Link>)}</div></details>)}
      <Link href={navHref(locale, "inquiry")} className="btn btn--primary" onClick={() => setOpen(false)}>{dict.nav.inquiry}<ArrowUpRight size={16} /></Link>
    </div> : null}
  </>;
}
