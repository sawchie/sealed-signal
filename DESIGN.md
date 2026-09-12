---
name: PokeScratch
description: Arcade After Dark — photo-led sealed Pokémon product comparison.
colors:
  ground: "#080b16"
  surface: "#101421"
  purple: "#c68bff"
  focus: "#8be5ef"
  positive: "#55edaa"
  caution: "#ffd56c"
  negative: "#ff8fae"
  white: "#ffffff"
typography:
  display:
    fontFamily: '"Space Grotesk Variable", ui-sans-serif, sans-serif'
    fontSize: "clamp(34px, 3.5vw, 52px)"
    lineHeight: 1.12
    letterSpacing: "-.035em"
  title:
    fontSize: "15px"
    fontWeight: 650
    lineHeight: 1.4
  price:
    fontSize: "clamp(20px, 1.95vw, 29px)"
    lineHeight: 1.2
rounded:
  control: "5px"
  search: "6px"
  card: "7px"
spacing:
  control-gap: "8px"
  price-gap: "12px"
  card-padding: "16px"
  gallery-gap: "18px"
  desktop-gutter: "32px"
---

# Design System: PokeScratch

## Overview

Creative North Star: **Arcade After Dark**. A dark navy gallery with restrained purple and cyan accents. Real sealed-product photography leads; complete names and paired retail/market values make comparison immediate. This documents the built catalog and shared header, not a replacement for the existing detail/admin composition.

The requested Concept 04 high-resolution, left-facing mascot remains unfinished after image-generation failures. The existing pixel mascot is retained, without an enclosing card.

## Colors

Purple emphasizes the headline and selected controls; cyan identifies keyboard focus. Market numbers and badges use the same centralized green/yellow/red profitability state. Never recolor market figures independently of recommendation logic. Missing values remain muted, never zero.

## Typography

Space Grotesk provides the display, names, and price figures. Compact existing monospace treatments remain on quick-filter and price labels. Names wrap without truncation; avoid redundant eyebrows repeating them. Mobile names grow to 17px and prices to 30px.

## Layout

Centered maximum 1440px catalog/header; 32px desktop gutters, 16px mobile. Four gallery columns, three at 1150px, two at 800px, one at 600px. Search precedes a horizontal quick-filter row. Results count and actual price-update date sit above the gallery. Set/sort use compact selects; mobile sorting gets its own full-width row.

The desktop hero pairs copy with the right-hand mascot. Mobile uses a compact mascot beside the headline. Decorative overflow is clipped locally, never globally hidden over the controls.

## Elevation & Depth

Cards are flat at rest with thin borders. Hover/focus adds a purple border, soft shadow, and slight lift. Product cutouts have a soft grounding shadow. Reduced motion removes image transitions and card lift. The filter drawer uses protected focus, Escape, and a dark backdrop.

## Shapes

Small 5–7px corners rather than pills. Images use contain-fit presentation. Price pairs are flat columns with one divider above, not nested cards.

## Components

- Header: purple outline mark, white wordmark, restrained native navigation; mobile retains Manage Data.
- Product card: semantic detail link, dominant real image, complete title, optional non-repeated set label below, paired prices, one recommendation flag.
- Search: 50px height, clear action, visible focus and strong contrast.
- Filters: horizontal quick choices, scalable set dropdown, advanced drawer.
- Load more: batches of 48; calculations/filtering use the complete catalog.

## Do's and Don'ts

Keep photos and both prices dominant, sources on detail pages, update date near the results heading, and labels beside semantic colors. Do not add dashboard widgets, duplicated metadata, invented availability, or public methodology content. Preserve D1/admin behavior and product routes.

## Collector guides and price-per-pack comparison

These surfaces extend Arcade After Dark: Guides prioritize reading; the calculator prioritizes completing a comparison. The five-guide index uses divided text rows. Articles use a 74ch measure, clear sections, publication metadata, inline sources, and related links.

Content typography uses rem values: headings `clamp(2rem, 4vw, 3rem)`, section headings `1.5rem`, body `1rem` with `1.75` line-height, metadata `.875rem`. Local readability steps are foreground `#f5f5ff`, secondary `#bfc6db`, placeholder `#9da8c2`, dividers `#30364b`, control borders `#505973`, and underlined links `#d2a2ff`.

The calculator pairs labeled fieldsets, optional costs, inline validation, and tabular `2.5rem` purple cost-per-pack results. Incomplete results stay an em dash; cyan comparisons describe pack costs, not profitability. Differences and ties use displayed-cent precision. All inputs remain in browser memory.

Content has a centered 1100px maximum width. At 700px, purchase panels stack and gutters become 16px. At 800px, native navigation becomes a Menu disclosure with Escape restoring summary focus. Product details add copy/correction actions and up to three real active same-set products without expanding browse cards.
