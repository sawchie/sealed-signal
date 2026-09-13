"use client";
import { usePathname } from "next/navigation";
const links = [["/collection", "My Collection"], ["/", "Catalog"], ["/guides", "Guides"], ["/tools", "Tools"], ["/about", "About"]];
export function SiteNavigation() {
  const pathname = usePathname();
  const items = links.map(([href, label]) => <a key={href} href={href} aria-current={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined}>{label}</a>);
  // Native details supplies keyboard opening/closing; Escape additionally restores summary focus.
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
  return <><nav className="site-nav" aria-label="Primary navigation">{items}</nav><details className="mobile-navigation" onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus(); } }}><summary>Menu</summary><nav aria-label="Mobile navigation">{items}</nav></details></>;
}
