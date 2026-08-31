import type {
  MarketPriceSource,
  ProductCategory,
  ProductWithMarketPrice,
} from "@/lib/domain/types";

const MARKET_SNAPSHOT = "2026-08-30T12:00:00.000Z";
const RECENT_SALES_METHOD =
  "Manual TCGplayer Market Price snapshot. TCGplayer describes Market Price as a recent-sales-based estimate that averages multiple completed transactions and reduces outlier influence.";

const tcgMarket = (query: string): MarketPriceSource => ({
  id: "tcgplayer-market",
  label: "TCGplayer Market Price snapshot",
  kind: "aggregate",
  url: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(query)}&view=grid`,
});

const pokemonRetail = (query: string): MarketPriceSource => ({
  id: "pokemon-center-retail",
  label: "Pokémon Center retail catalog",
  kind: "manual",
  url: `https://www.pokemoncenter.com/search/${encodeURIComponent(query.toLowerCase().replaceAll(" ", "-"))}`,
});

type ExpandedProductInput = {
  id: string;
  name: string;
  shortName?: string;
  aliases?: string[];
  setName: string;
  category: ProductCategory;
  releaseDate: string;
  msrpCents: number;
  marketCents: number;
  marketQuery?: string;
  notes?: string;
};

function product(input: ExpandedProductInput): ProductWithMarketPrice {
  const query = input.marketQuery ?? input.name;
  return {
    id: input.id,
    slug: input.id,
    name: input.name,
    shortName: input.shortName ?? input.name,
    aliases: input.aliases ?? [],
    setName: input.setName,
    series: "Scarlet & Violet",
    category: input.category,
    releaseDate: input.releaseDate,
    imageUrl: null,
    msrpCents: input.msrpCents,
    retailPriceSource: pokemonRetail(input.setName),
    currency: "USD",
    notes:
      input.notes ??
      "Product identity and release family verified against the official Pokémon TCG product gallery. Retail reference is the original US catalog price, not a temporary sale.",
    active: true,
    marketPrice: {
      productId: input.id,
      amountCents: input.marketCents,
      currency: "USD",
      source: tcgMarket(query),
      updatedAt: MARKET_SNAPSHOT,
      methodology: RECENT_SALES_METHOD,
    },
  };
}

/**
 * High-interest modern sealed products that broaden the bundled fallback.
 * Persisted D1 rows still win when an administrator supplies a newer record.
 */
export const expandedSeedProducts: ProductWithMarketPrice[] = [
  product({ id: "black-bolt-etb", name: "Black Bolt Elite Trainer Box", shortName: "Black Bolt ETB", aliases: ["black bolt etb", "zekrom etb"], setName: "Black Bolt", category: "Elite Trainer Box", releaseDate: "2025-07-18", msrpCents: 4999, marketCents: 16475 }),
  product({ id: "black-bolt-pc-etb", name: "Black Bolt Pokémon Center Elite Trainer Box", shortName: "Black Bolt PC ETB", aliases: ["black bolt pc etb", "zekrom pokemon center etb"], setName: "Black Bolt", category: "Pokémon Center Elite Trainer Box", releaseDate: "2025-07-18", msrpCents: 5999, marketCents: 27653 }),
  product({ id: "black-bolt-booster-bundle", name: "Black Bolt Booster Bundle", aliases: ["black bolt bundle", "black bolt six pack"], setName: "Black Bolt", category: "Booster Bundle", releaseDate: "2025-07-18", msrpCents: 2694, marketCents: 9611 }),
  product({ id: "black-bolt-binder-collection", name: "Black Bolt Binder Collection", aliases: ["black bolt binder"], setName: "Black Bolt", category: "Special Collection", releaseDate: "2025-08-01", msrpCents: 3499, marketCents: 7987 }),
  product({ id: "white-flare-etb", name: "White Flare Elite Trainer Box", shortName: "White Flare ETB", aliases: ["white flare etb", "reshiram etb"], setName: "White Flare", category: "Elite Trainer Box", releaseDate: "2025-07-18", msrpCents: 4999, marketCents: 15389 }),
  product({ id: "white-flare-pc-etb", name: "White Flare Pokémon Center Elite Trainer Box", shortName: "White Flare PC ETB", aliases: ["white flare pc etb", "reshiram pokemon center etb"], setName: "White Flare", category: "Pokémon Center Elite Trainer Box", releaseDate: "2025-07-18", msrpCents: 5999, marketCents: 24582 }),
  product({ id: "white-flare-booster-bundle", name: "White Flare Booster Bundle", aliases: ["white flare bundle", "white flare six pack"], setName: "White Flare", category: "Booster Bundle", releaseDate: "2025-07-18", msrpCents: 2694, marketCents: 8658 }),
  product({ id: "white-flare-binder-collection", name: "White Flare Binder Collection", aliases: ["white flare binder"], setName: "White Flare", category: "Special Collection", releaseDate: "2025-08-01", msrpCents: 3499, marketCents: 7331 }),
  product({ id: "unova-poster-collection", name: "Black Bolt & White Flare Unova Poster Collection", shortName: "Unova Poster Collection", aliases: ["unova poster", "black white poster"], setName: "Black Bolt / White Flare", category: "Special Collection", releaseDate: "2025-07-18", msrpCents: 2499, marketCents: 4410, marketQuery: "Black Bolt Unova Poster Collection" }),

  product({ id: "twilight-masquerade-etb", name: "Twilight Masquerade Elite Trainer Box", shortName: "Twilight Masquerade ETB", aliases: ["twilight etb", "ogerpon etb"], setName: "Twilight Masquerade", category: "Elite Trainer Box", releaseDate: "2024-05-24", msrpCents: 4999, marketCents: 10691 }),
  product({ id: "twilight-masquerade-pc-etb", name: "Twilight Masquerade Pokémon Center Elite Trainer Box", shortName: "Twilight Masquerade PC ETB", aliases: ["twilight pc etb", "ogerpon pokemon center etb"], setName: "Twilight Masquerade", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-05-24", msrpCents: 5999, marketCents: 19071 }),
  product({ id: "twilight-masquerade-booster-bundle", name: "Twilight Masquerade Booster Bundle", aliases: ["twilight bundle", "twilight six pack"], setName: "Twilight Masquerade", category: "Booster Bundle", releaseDate: "2024-05-24", msrpCents: 2694, marketCents: 7688 }),
  product({ id: "twilight-masquerade-booster-box", name: "Twilight Masquerade Booster Display Box", shortName: "Twilight Masquerade Booster Box", aliases: ["twilight booster box", "twilight 36 packs"], setName: "Twilight Masquerade", category: "Booster Box", releaseDate: "2024-05-24", msrpCents: 16164, marketCents: 35139 }),

  product({ id: "stellar-crown-etb", name: "Stellar Crown Elite Trainer Box", shortName: "Stellar Crown ETB", aliases: ["stellar etb", "terapagos etb"], setName: "Stellar Crown", category: "Elite Trainer Box", releaseDate: "2024-09-13", msrpCents: 4999, marketCents: 15621 }),
  product({ id: "stellar-crown-pc-etb", name: "Stellar Crown Pokémon Center Elite Trainer Box", shortName: "Stellar Crown PC ETB", aliases: ["stellar pc etb", "terapagos pokemon center etb"], setName: "Stellar Crown", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-09-13", msrpCents: 5999, marketCents: 17751 }),
  product({ id: "stellar-crown-booster-bundle", name: "Stellar Crown Booster Bundle", aliases: ["stellar bundle", "stellar six pack"], setName: "Stellar Crown", category: "Booster Bundle", releaseDate: "2024-09-13", msrpCents: 2694, marketCents: 7343 }),
  product({ id: "stellar-crown-booster-box", name: "Stellar Crown Booster Display Box", shortName: "Stellar Crown Booster Box", aliases: ["stellar booster box", "stellar 36 packs"], setName: "Stellar Crown", category: "Booster Box", releaseDate: "2024-09-13", msrpCents: 16164, marketCents: 31396 }),

  product({ id: "shrouded-fable-etb", name: "Shrouded Fable Elite Trainer Box", shortName: "Shrouded Fable ETB", aliases: ["shrouded etb", "pecharunt etb"], setName: "Shrouded Fable", category: "Elite Trainer Box", releaseDate: "2024-08-23", msrpCents: 4999, marketCents: 11367 }),
  product({ id: "shrouded-fable-pc-etb", name: "Shrouded Fable Pokémon Center Elite Trainer Box", shortName: "Shrouded Fable PC ETB", aliases: ["shrouded pc etb", "pecharunt pokemon center etb"], setName: "Shrouded Fable", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-08-23", msrpCents: 5999, marketCents: 16707 }),
  product({ id: "shrouded-fable-booster-bundle", name: "Shrouded Fable Booster Bundle", aliases: ["shrouded bundle", "shrouded six pack"], setName: "Shrouded Fable", category: "Booster Bundle", releaseDate: "2024-09-06", msrpCents: 2694, marketCents: 5340 }),
  product({ id: "shrouded-fable-kingambit-collection", name: "Shrouded Fable Kingambit Illustration Collection", shortName: "Kingambit Illustration Collection", aliases: ["kingambit box", "kingambit collection"], setName: "Shrouded Fable", category: "Special Collection", releaseDate: "2024-08-02", msrpCents: 2199, marketCents: 5235 }),
  product({ id: "shrouded-fable-greninja-collection", name: "Shrouded Fable Greninja ex Special Illustration Collection", shortName: "Greninja ex Illustration Collection", aliases: ["greninja box", "greninja illustration collection"], setName: "Shrouded Fable", category: "Special Collection", releaseDate: "2024-08-02", msrpCents: 2999, marketCents: 21223 }),

  product({ id: "paldean-fates-etb", name: "Paldean Fates Elite Trainer Box", shortName: "Paldean Fates ETB", aliases: ["paldean etb", "mimikyu etb"], setName: "Paldean Fates", category: "Elite Trainer Box", releaseDate: "2024-01-26", msrpCents: 4999, marketCents: 47114 }),
  product({ id: "paldean-fates-pc-etb", name: "Paldean Fates Pokémon Center Elite Trainer Box", shortName: "Paldean Fates PC ETB", aliases: ["paldean pc etb", "mimikyu pokemon center etb"], setName: "Paldean Fates", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-01-26", msrpCents: 5999, marketCents: 61233 }),
  product({ id: "paldean-fates-booster-bundle", name: "Paldean Fates Booster Bundle", aliases: ["paldean bundle", "paldean six pack"], setName: "Paldean Fates", category: "Booster Bundle", releaseDate: "2024-02-23", msrpCents: 2694, marketCents: 17524 }),

  product({ id: "temporal-forces-etb-walking-wake", name: "Temporal Forces Elite Trainer Box — Walking Wake", shortName: "Temporal Forces Walking Wake ETB", aliases: ["temporal walking wake etb", "blue temporal etb"], setName: "Temporal Forces", category: "Elite Trainer Box", releaseDate: "2024-03-22", msrpCents: 4999, marketCents: 13227 }),
  product({ id: "temporal-forces-etb-iron-leaves", name: "Temporal Forces Elite Trainer Box — Iron Leaves", shortName: "Temporal Forces Iron Leaves ETB", aliases: ["temporal iron leaves etb", "green temporal etb"], setName: "Temporal Forces", category: "Elite Trainer Box", releaseDate: "2024-03-22", msrpCents: 4999, marketCents: 13039 }),
  product({ id: "temporal-forces-pc-etb-walking-wake", name: "Temporal Forces Pokémon Center Elite Trainer Box — Walking Wake", shortName: "Temporal Forces Walking Wake PC ETB", aliases: ["temporal walking wake pc etb"], setName: "Temporal Forces", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-03-22", msrpCents: 5999, marketCents: 20904 }),
  product({ id: "temporal-forces-pc-etb-iron-leaves", name: "Temporal Forces Pokémon Center Elite Trainer Box — Iron Leaves", shortName: "Temporal Forces Iron Leaves PC ETB", aliases: ["temporal iron leaves pc etb"], setName: "Temporal Forces", category: "Pokémon Center Elite Trainer Box", releaseDate: "2024-03-22", msrpCents: 5999, marketCents: 19504 }),
  product({ id: "temporal-forces-booster-box", name: "Temporal Forces Booster Display Box", shortName: "Temporal Forces Booster Box", aliases: ["temporal booster box", "temporal 36 packs"], setName: "Temporal Forces", category: "Booster Box", releaseDate: "2024-03-22", msrpCents: 16164, marketCents: 29664 }),
];
