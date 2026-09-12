export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>PokeScratch</strong>
        <p>Independent collector tool; not affiliated with The Pokémon Company. Prices and outcomes are estimates.</p>
      </div>
      <div className="site-footer__links">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy</a>
        <a href="/admin">Manage catalog</a>
      </div>
    </footer>
  );
}
