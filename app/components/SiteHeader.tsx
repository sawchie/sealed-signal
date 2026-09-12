type SiteHeaderProps = {
  compact?: boolean;
};

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  return (
    <header className={`site-header${compact ? " site-header--compact" : ""}`}>
      <div className="site-header__inner">
        {/* Native navigation avoids the production adapter swallowing client-side route clicks. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/" aria-label="PokeScratch home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="#0a1225" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <span>
            <span className="brand__name">PokeScratch</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          {/* Native links preserve navigation through the production adapter. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Catalog</a>
          <a href="/admin">Manage data</a>
        </nav>
      </div>
    </header>
  );
}
