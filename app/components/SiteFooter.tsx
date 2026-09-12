/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>PokeScratch</strong>
        <p>Independent collector tool; not affiliated with The Pokémon Company. Prices and outcomes are estimates.</p>
      </div>
      <div className="site-footer__links">
        <a href="/guides">Guides</a>
        <a href="/tools">Tools</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy</a>
        <a href="/admin">Manage catalog</a>
      </div>
    </footer>
  );
}
