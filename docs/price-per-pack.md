# Product-detail price per pack — September 13, 2026

Product details show paired per-pack values directly beneath the reference-retail and market totals. Upcoming products retain the “Presale market estimate” label. The secondary text follows the existing detail-page typography and responsive price layout.

- Each value divides its corresponding product price by the verified booster-pack count from product facts. Fractional cents are retained until currency formatting.
- The context line links to product facts and states the basis: before tax and shipping, with no value deducted for promos or extras. These are sealed-product cost comparisons, not loose-pack quotes.
- An absent or invalid pack count produces “Price per pack unavailable” with “pack count not verified,” without guessing from the product category. With a valid count but a missing price, the corresponding value reads “Per pack unavailable.” Unknown values are never converted to zero.
- Reference-retail and market per-pack values remain independent of custom purchase prices, sale prices, and selling-cost inputs in the buy check.
- The existing “Compare this product’s pack cost” link remains in place. Its product selection prefills the calculator with reference retail and the verified pack count, where available, for a separate checkout-cost comparison.

Implementation is limited to `app/components/ProductDetailClient.tsx`, two supporting rules in `app/catalog-theme.css`, and the shared calculation helper in `lib/pack-comparison.ts`. No catalog facts, price sources, recommendation rules, design-system files, or deployment settings are changed by this feature.
