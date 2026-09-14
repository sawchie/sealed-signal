# Mobile catalog cards

Mode: Operate. Scope: catalog cards at 600px and below; preserve desktop and My Collection.

## Approved reference

The user's chosen concept is identified by its composition, not image numbering: equal image and information halves, heart and plus beneath the image at bottom left, buying signal above the title at top right, and retail above market in a right-aligned price group. Keep the existing PokeScratch identity and actual product images, names, prices, and signal logic. Do not reproduce the mockup's invented packaging or prices.

## Implementation constraints

- Packaging occupies the left half without controls obscuring it.
- Heart and collection controls remain independent 44px-tall buttons outside the detail link.
- Use one signal per card, placed above the title on mobile and over the image on desktop.
- Retain full product names and omit redundant set metadata using the existing rule.
- Prices remain readable with honest unknown and preorder states.
- Retain the current responsive breakpoints, routes, filters, saving, and calculations.

## Verification

Verified at 320px and 390px with no horizontal overflow, and at 1440px with the existing four-column desktop layout. Checked saving/unsaving, collection addition, and product detail navigation. Temporary test additions were removed.
