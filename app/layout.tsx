import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sealed Signal — Pokémon Resale Desk",
    template: "%s | Sealed Signal",
  },
  description:
    "A fast, fee-aware decision tool for sealed Pokémon TCG resale opportunities.",
  applicationName: "Sealed Signal",
  icons: { icon: "/favicon.svg" },
  keywords: [
    "Pokémon TCG MSRP",
    "sealed Pokémon market price",
    "Pokémon resale value",
    "Pokémon product profit",
  ],
  openGraph: {
    type: "website",
    title: "Sealed Signal — Check the shelf. Know the signal.",
    description:
      "A collector-built buy check for sealed Pokémon products, with transparent manual snapshots and fee-aware estimates.",
    siteName: "Sealed Signal",
    images: [
      {
        url: "/og.png",
        width: 1659,
        height: 948,
        alt: "Sealed Signal — check the shelf, know the signal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sealed Signal — Collector-Built Buy Checks",
    description: "Fee-aware resale estimates and honest market snapshots for sealed Pokémon products.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffdf9",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
