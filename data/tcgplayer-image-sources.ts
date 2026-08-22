/**
 * Local copies of product imagery authorized for Sealed Signal by TCGplayer.
 * Each local asset keeps the catalog product ID it came from for provenance.
 */
export const TCGPLAYER_PRODUCT_IMAGE_SOURCES = {
  "destined-rivals-etb": 624676,
  "destined-rivals-pc-etb": 624675,
  "journey-together-etb": 610930,
  "journey-together-booster-bundle": 610953,
  "journey-together-booster-box": 610931,
  "surging-sparks-etb": 565630,
  "surging-sparks-pc-etb": 565632,
  "surging-sparks-booster-box": 565606,
  "151-booster-bundle": 502000,
  "151-pc-etb": 501999,
  "prismatic-evolutions-etb": 593355,
  "prismatic-evolutions-mini-tin": 593459,
  "paldean-fates-charizard-tin": 528056,
  "terapagos-ex-upc": 575198,
  "charizard-ex-super-premium": 560625,
  "blooming-waters-premium": 609597,
  "crown-zenith-sea-sky": 563307,
  "151-costco-mini-tins": 587746,
  "151-sams-mini-tin-bundle": 662302,
  "destined-rivals-sleeved-pack": 624684,
  "perfect-order-etb": 672401,
  "perfect-order-pc-etb": 672404,
  "perfect-order-booster-box": 672394,
  "perfect-order-booster-bundle": 672396,
  "ascended-heroes-etb": 668496,
  "ascended-heroes-pc-etb": 668497,
  "ascended-heroes-mini-tin": 668532,
  "mega-kangaskhan-ex-box": 654211,
  "mega-charizard-x-upc": 654213,
  "prismatic-super-premium": 622770,
  "slashing-legends-zacian-tin": 623648,
  "phantasmal-flames-etb": 654136,
  "prismatic-surprise-box": 593466,
  "destined-rivals-kangaskhan-blister": 625683,
} as const;

export function tcgplayerProductImage(id: string) {
  return id in TCGPLAYER_PRODUCT_IMAGE_SOURCES ? `/product-images/${id}.jpg` : null;
}
