"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native keyboard behavior, with all content retained in rendered HTML. */
export function DetailDisclosure({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const revealAnchor = (hash = location.hash) => {
      let target: HTMLElement | null = null;
      try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
      if (target && ref.current?.contains(target)) {
        let ancestor: HTMLElement | null = target;
        while (ancestor && ref.current.contains(ancestor)) {
          if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
          ancestor = ancestor.parentElement;
        }
        requestAnimationFrame(() => target?.scrollIntoView({ block: "start" }));
      }
    };
    const onHashChange = () => revealAnchor();
    // A second click on the same hash does not emit hashchange.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (anchor) revealAnchor(anchor.getAttribute("href") ?? "");
    };
    const resize = () => { if (ref.current) ref.current.open = !media.matches; revealAnchor(); };
    resize();
    media.addEventListener("change", resize);
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onAnchorClick);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("hashchange", onHashChange); document.removeEventListener("click", onAnchorClick); };
  }, []);
  return <details ref={ref} id={id} className="detail-disclosure"><summary>{title}</summary><div className="detail-disclosure__body">{children}</div></details>;
}
