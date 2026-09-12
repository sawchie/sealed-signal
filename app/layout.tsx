import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import "./neon-override.css";
import "./catalog-theme.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokescratch.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PokeScratch — Pokémon Sealed Catalog",
    template: "%s | PokeScratch",
  },
  description:
    "A fast, fee-aware decision tool for sealed Pokémon TCG resale opportunities.",
  applicationName: "PokeScratch",
  verification: { google: "jdFlPWY8SbBX1yV3QyYEIdBePdE9PkerC7gzGrQR350" },
  icons: { icon: "/favicon.svg" },
  keywords: [
    "Pokémon TCG MSRP",
    "sealed Pokémon market price",
    "Pokémon resale value",
    "Pokémon product profit",
  ],
  openGraph: {
    type: "website",
    title: "PokeScratch — Compare retail and market values",
    description:
      "A quick sealed Pokémon TCG buy check with transparent manual market snapshots.",
    siteName: "PokeScratch",
    images: [
      {
        url: "/og-pokescratch.png",
        width: 1200,
        height: 630,
        alt: "PokeScratch — compare retail and market values",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PokeScratch — Compare retail and market values",
    description: "Quick resale estimates and honest market snapshots for sealed Pokémon products.",
    images: ["/og-pokescratch.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090916",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
