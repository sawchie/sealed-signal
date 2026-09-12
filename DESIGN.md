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
  saved: "#ff96bd"
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

The mascot uses the exact user-selected Concept 04 pixels, cropped, background-extracted, and mirrored left. It is a 203×188 transparent asset without surrounding text or a card. A higher-resolution restoration remains unavailable after image-generation failures; this asset is not represented as new high-resolution detail.

## Colors

Purple emphasizes the headline and selected controls; cyan identifies keyboard focus. Market numbers and badges use the same centralized green/yellow/red profitability state. Never recolor market figures independently of recommendation logic. Missing values remain muted, never zero.

Saved pink identifies a collector’s chosen products independently of profitability. Unsaved hearts are muted outlines; saved hearts fill pink with a pale pixel highlight over a dark plum control. Selected All/Saved controls retain the catalog’s purple selection treatment.

## Typography

Space Grotesk provides the display, names, and price figures. Compact existing monospace treatments remain on quick-filter and price labels. Names wrap without truncation; avoid redundant eyebrows repeating them. Mobile names grow to 17px and prices to 30px.

## Layout

Centered maximum 1440px catalog/header; 32px desktop gutters, 16px mobile. Four gallery columns, three at 1150px, two at 800px, one at 600px. Search precedes wrapping product-type buttons: all options stay visible without horizontal scrolling. Results count and actual price-update date sit above the gallery. Set/sort use compact selects; mobile sorting gets its own full-width row.

The desktop hero pairs copy with the right-hand mascot. Mobile uses a compact mascot beside the headline. The existing cutout sits on a shallow oval collector display plinth, with a restrained purple rim and contact shadow. Its foot-aligned reflection is vertically compressed to 55%, kept at 20% opacity, and faded over the surface rather than left floating below it. The plinth uses local material tones (#34324c, #181c2d, and the existing navy surface), not a new semantic palette. No arcade grid or enclosing panel. Both images reuse one cached asset and are decorative. Decorative overflow is clipped locally, never globally hidden over the controls; the plinth contracts to the mascot width on mobile.

At widths of 1100px or more, the gallery row pairs a 188px sticky left rail with the products, so “Browse by set” starts at the top of the first cards rather than beside the controls. The rail uses the viewport height minus 40px, without the old 680px cap, with a visible reserved scrollbar and bottom breathing room. Its dynamically derived buttons share the existing set state with dropdowns; search, sorting, product types, buying signals, and advanced filters remain composed. Smaller screens retain the set dropdown and filter drawer.

The All products / Saved switch sits above the results heading with a saved-item count. Beside it, separate wrapping buying-signal buttons use the centralized Strong Buy / Buy / Fair / Bad Buy labels and green/yellow/red tones. All signals resets only that choice. The existing advanced recommendation select stays synchronized. In Saved, the opening-preference checkbox and browser-only storage explanation remain visible above the results.

On desktop, these controls, saved help, results heading, and sorting/view controls share the product column's left edge, using the same rail-width and gap variables as the gallery. The hero search and product-type buttons retain their original left edge. The active Filters button uses the purple selected-control treatment with white text; the drawer explicitly uses a navy surface and dark native controls, preventing old light-theme colors from leaking through.

## Elevation & Depth

Cards are flat at rest with thin borders. Hover/focus adds a purple border, soft shadow, and slight lift. Product cutouts have a soft grounding shadow. Reduced motion removes image transitions and card lift. The filter drawer uses protected focus, Escape, and a dark backdrop.

## Shapes

Small 5–7px corners rather than pills. Images use contain-fit presentation. Price pairs are flat columns with one divider above, not nested cards.

## Components

- Header: purple outline mark, white wordmark, restrained native navigation; mobile retains Manage Data.
- Product card: semantic detail link, dominant real image, complete title, optional non-repeated set label below, paired prices, one recommendation flag. A separate sibling save button occupies the upper-left corner; activating it does not open the detail page.
- Save heart: authored stepped SVG in a 44×44px button with 6px corners, inset 8px from the card top and left. Outline, filled, hover and cyan keyboard-focus states remain distinct. The same control appears beside the table’s Open link. Accessible labels name the product/action; pressed state exposes whether it is saved.
- Saved shelf: All products / Saved controls have a 44px minimum height. Saved composes with search, set, quick/advanced filters, sorting and grid/table views. Selections persist only in this browser; clearing site data removes them. “Open to Saved next time” is an explicit checkbox; an empty saved collection opens All products next visit. Storage failures disclose visit-only saving.
- Saved empty state: flat navy bordered panel, 7px corners and a 32px pink outline heart. “Your saved shelf is waiting” explains the first action; “Show all products” returns to the full catalog and clears search/filters. Filtered-out saved items use the no-matches explanation without an icon. Removing an item in Saved returns keyboard focus to the Saved switch.
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
