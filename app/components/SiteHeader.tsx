type SiteHeaderProps = {
  compact?: boolean;
};

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  return (
    <header className={`site-header${compact ? " site-header--compact" : ""}`}>
      <div className="site-header__inner">
        {/* Native navigation avoids the production adapter swallowing client-side route clicks. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/" aria-label="Sealed Signal home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M13.6 1.8 5.3 13h5.5l-.7 9.2L18.7 10h-5.6l.5-8.2Z" />
            </svg>
          </span>
          <span>
            <span className="brand__name">Sealed Signal</span>
            <span className="brand__descriptor">Pokémon resale desk</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="/admin">Manage data</a>
        </nav>
      </div>
    </header>
  );
}
