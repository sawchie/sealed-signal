import Link from "next/link";

type SiteHeaderProps = {
  compact?: boolean;
};

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  return (
    <header className={`site-header${compact ? " site-header--compact" : ""}`}>
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="Sealed Signal home">
          <span className="brand__mark" aria-hidden="true">
            SS
          </span>
          <span>
            <span className="brand__name">Sealed Signal</span>
            <span className="brand__descriptor">Pokémon resale desk</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/admin">Manage data</Link>
        </nav>
      </div>
    </header>
  );
}
