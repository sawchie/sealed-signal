import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./neon-override.css";

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
    title: "Sealed Signal — Compare MSRP to resale values",
    description:
      "A quick sealed Pokémon TCG buy check with transparent manual market snapshots.",
    siteName: "Sealed Signal",
    images: [
      {
        url: "/og.png",
        width: 1659,
        height: 948,
        alt: "Sealed Signal — compare MSRP to resale values",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sealed Signal — Compare MSRP to resale values",
    description: "Quick resale estimates and honest market snapshots for sealed Pokémon products.",
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
