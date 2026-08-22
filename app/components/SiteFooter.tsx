import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Sealed Signal</strong>
        <p>Independent collector tool; not affiliated with The Pokémon Company. Prices and outcomes are estimates.</p>
      </div>
      <div className="site-footer__links">
        <Link href="/methodology">How pricing works</Link>
        <Link href="/admin">Manage catalog</Link>
      </div>
    </footer>
  );
}
