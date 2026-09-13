/** Browser-local collection records. Amounts are integer USD cents, never implied purchase costs. */
export type CollectionProduct = {
  slug: string; name: string; setName: string | null; category: string;
  imageUrl: string | null; packCount: number | null; msrpCents: number | null;
  marketCents: number | null; marketUpdatedAt: string | null;
};
export type CollectionLot = {
  id: string; slug: string; name: string; setName: string | null; category: string;
  imageUrl: string | null; packCount: number | null; quantity: number;
  unitCostCents: number | null; acquiredOn: string; addedAt: string;
};
export type CollectionSale = {
  id: string; lotId: string; quantity: number; proceedsCents: number;
  feesCents: number; soldOn: string;
};
export type CollectionSnapshot = {
  at: string; marketCents: number; retailCents: number; units: number;
  pricedUnits: number; retailUnits: number; holdingsKey: string;
};
export type CollectionState = {
  version: 1; lots: CollectionLot[]; sales: CollectionSale[]; snapshots: CollectionSnapshot[];
};
export type CollectionSummary = {
  ownedUnits: number; distinctProducts: number; marketCents: number; pricedUnits: number;
  retailCents: number; retailUnits: number; paidCents: number; costedUnits: number;
  knownPacks: number; packKnownUnits: number; packCostCents: number; packCostPacks: number;
  unrealizedCents: number; unrealizedUnits: number; saleProceedsCents: number;
  saleFeesCents: number; realizedCents: number; realizedUnits: number; soldUnits: number;
  setPacks: Array<{ setName: string; packs: number; units: number; unknownPackUnits: number }>;
};

export const COLLECTION_KEY = 'pokescratch:collection:v1';
/** Shared UTF-8 limit for persisted JSON and the backup file picker. */
export const MAX_COLLECTION_BACKUP_BYTES = 12_000_000;
const MAX_ROWS = 10_000;
const MAX_UNITS = 1_000_000;
const MAX_CENTS = 100_000_000;
const MAX_SNAPSHOTS = 365;

/** Purchase and sale dates follow the user's calendar, not the UTC day. */
export function localCalendarDay(date = new Date()): string {
  requireValue(Number.isFinite(date.getTime()), 'Invalid current date.');
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function emptyCollection(): CollectionState {
  return { version: 1, lots: [], sales: [], snapshots: [] };
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `Invalid ${label}.`);
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number, label: string): number {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `${label} must be a whole number from ${min} to ${max}.`);
  return value;
}
function string(value: unknown, label: string, max = 500): string {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `Invalid ${label}.`);
  return value;
}
function nullableString(value: unknown, label: string, max = 500): string | null {
  return value === null ? null : string(value, label, max);
}
function cents(value: unknown, label: string): number | null {
  return value === null ? null : integer(value, 0, MAX_CENTS, label);
}
function packs(value: unknown): number | null {
  return value === null ? null : integer(value, 1, 10_000, 'Pack count');
}
function imageUrl(value: unknown): string | null {
  if (value === null) return null;
  const url = string(value, 'image URL', 2_000);
  // Catalog images may be root-relative; imported active-content schemes are not accepted.
  requireValue((url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) || /^https?:\/\//i.test(url), 'Invalid image URL.');
  return url;
}
function day(value: unknown, label: string): string {
  const result = string(value, label, 10);
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(result), `${label} must be a YYYY-MM-DD date.`);
  const parsed = new Date(`${result}T00:00:00.000Z`);
  requireValue(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result, `Invalid ${label}.`);
  return result;
}
function timestamp(value: unknown, label: string): string {
  const result = string(value, label, 32);
  requireValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result), `Invalid ${label}.`);
  day(result.slice(0, 10), label);
  requireValue(Number.isFinite(Date.parse(result)) && Number(result.slice(11, 13)) < 24
    && Number(result.slice(14, 16)) < 60 && Number(result.slice(17, 19)) < 60, `Invalid ${label}.`);
  return result;
}
function acquisition(value: unknown, currentDay: string): string {
  const result = day(value, 'Acquisition date');
  requireValue(result <= currentDay, 'Acquisition date cannot be in the future.');
  return result;
}
function rows(value: unknown, label: string, max = MAX_ROWS): unknown[] {
  requireValue(Array.isArray(value) && value.length <= max, `Invalid ${label}, or too many records.`);
  return value;
}

/** Strictly validate imported data and reconstruct records, stripping unknown fields. */
function validateState(input: unknown, nowISO: string): CollectionState {
  const raw = object(input, 'collection backup');
  requireValue(raw.version === 1, 'Unsupported collection backup version.');
  const nowTime = Date.parse(timestamp(nowISO, 'current time'));
  const currentDay = localCalendarDay(new Date(nowTime));
  const ids = new Set<string>();
  const lots = rows(raw.lots, 'purchase lots').map(value => {
    const row = object(value, 'purchase lot');
    const id = string(row.id, 'lot ID', 200);
    requireValue(!ids.has(id), 'Duplicate lot ID.'); ids.add(id);
    const addedAt = timestamp(row.addedAt, 'added time');
    requireValue(Date.parse(addedAt) <= nowTime, 'Added time cannot be in the future.');
    return {
      id, slug: string(row.slug, 'product slug', 300), name: string(row.name, 'product name'),
      setName: nullableString(row.setName, 'set name'), category: string(row.category, 'category'),
      imageUrl: imageUrl(row.imageUrl), packCount: packs(row.packCount),
      quantity: integer(row.quantity, 1, 10_000, 'Quantity'),
      unitCostCents: cents(row.unitCostCents, 'Unit cost'),
      acquiredOn: acquisition(row.acquiredOn, currentDay), addedAt,
    };
  });
  requireValue(lots.reduce((total, lot) => total + lot.quantity, 0) <= MAX_UNITS, 'Collection exceeds 1,000,000 purchased units.');
  const byId = new Map(lots.map(lot => [lot.id, lot]));
  const sold = new Map<string, number>();
  const saleIds = new Set<string>();
  const sales = rows(raw.sales, 'sales').map(value => {
    const row = object(value, 'sale');
    const id = string(row.id, 'sale ID', 200);
    requireValue(!saleIds.has(id), 'Duplicate sale ID.'); saleIds.add(id);
    const lotId = string(row.lotId, 'sale lot ID', 200);
    const lot = byId.get(lotId);
    requireValue(lot, 'Sale references a missing purchase lot.');
    const quantity = integer(row.quantity, 1, 10_000, 'Sale quantity');
    const soldOn = day(row.soldOn, 'Sale date');
    requireValue(soldOn >= lot.acquiredOn, 'Sale date cannot be before the acquisition date.');
    requireValue(soldOn <= currentDay, 'Sale date cannot be in the future.');
    const total = (sold.get(lotId) ?? 0) + quantity;
    requireValue(total <= lot.quantity, 'Sales exceed the quantity purchased.'); sold.set(lotId, total);
    return { id, lotId, quantity, proceedsCents: integer(row.proceedsCents, 0, MAX_CENTS, 'Sale proceeds'),
      feesCents: integer(row.feesCents, 0, MAX_CENTS, 'Sale fees'), soldOn };
  });
  let previousTime = -Infinity;
  const snapshots = rows(raw.snapshots, 'snapshots', MAX_SNAPSHOTS).map(value => {
    const row = object(value, 'snapshot');
    const at = timestamp(row.at, 'snapshot time');
    const atTime = Date.parse(at);
    requireValue(atTime <= nowTime && atTime >= previousTime, 'Snapshot dates must be chronological and not in the future.');
    previousTime = atTime;
    const units = integer(row.units, 0, MAX_UNITS, 'Snapshot units');
    const pricedUnits = integer(row.pricedUnits, 0, units, 'Snapshot priced units');
    const retailUnits = integer(row.retailUnits, 0, units, 'Snapshot retail units');
    const marketCents = integer(row.marketCents, 0, pricedUnits * MAX_CENTS, 'Snapshot market value');
    const retailCents = integer(row.retailCents, 0, retailUnits * MAX_CENTS, 'Snapshot retail value');
    return { at, units, pricedUnits, retailUnits, marketCents, retailCents,
      holdingsKey: string(row.holdingsKey, 'snapshot holdings key', 1_000_000) };
  });
  return { version: 1, lots, sales, snapshots };
}

export function parseCollection(raw: string | null, nowISO = new Date().toISOString()): CollectionState {
  if (raw === null) return emptyCollection();
  requireValue(typeof raw === 'string' && raw.length <= MAX_COLLECTION_BACKUP_BYTES
    && new TextEncoder().encode(raw).byteLength <= MAX_COLLECTION_BACKUP_BYTES, 'Collection backup is too large.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Collection backup is not valid JSON.'); }
  return validateState(parsed, nowISO);
}

export function ownedQuantity(state: CollectionState, lot: CollectionLot): number {
  return lot.quantity - state.sales.reduce((total, sale) => total + (sale.lotId === lot.id ? sale.quantity : 0), 0);
}

export function addCollectionLot(state: CollectionState, product: CollectionProduct, quantity: number,
  unitCostCents: number | null, acquiredOn: string, nowISO: string, id: string): CollectionState {
  integer(quantity, 1, 10_000, 'Quantity');
  string(id, 'lot ID', 200);
  requireValue(!state.lots.some(lot => lot.id === id), 'Duplicate lot ID.');
  const soldLotIds = new Set(state.sales.map(sale => sale.lotId));
  const matching = state.lots.find(lot => lot.slug === product.slug && lot.acquiredOn === acquiredOn
    && lot.unitCostCents === unitCostCents && !soldLotIds.has(lot.id) && lot.quantity + quantity <= 10_000);
  if (matching) {
    return validateState({ ...state, lots: state.lots.map(lot => lot === matching
      ? { ...lot, quantity: lot.quantity + quantity } : lot) }, nowISO);
  }
  const lot: CollectionLot = { id, slug: product.slug, name: product.name, setName: product.setName,
    category: product.category, imageUrl: product.imageUrl, packCount: product.packCount,
    quantity, unitCostCents, acquiredOn, addedAt: nowISO };
  return validateState({ ...state, lots: [...state.lots, lot] }, nowISO);
}

export function updateCollectionLot(state: CollectionState, id: string,
  changes: Pick<CollectionLot, 'quantity' | 'unitCostCents' | 'acquiredOn'>,
  nowISO = new Date().toISOString()): CollectionState {
  requireValue(state.lots.some(lot => lot.id === id), 'Purchase lot not found.');
  return validateState({ ...state, lots: state.lots.map(lot => lot.id === id ? { ...lot,
    quantity: changes.quantity, unitCostCents: changes.unitCostCents, acquiredOn: changes.acquiredOn } : lot) }, nowISO);
}

export function removeCollectionLot(state: CollectionState, id: string): CollectionState {
  requireValue(state.lots.some(lot => lot.id === id), 'Purchase lot not found.');
  requireValue(!state.sales.some(sale => sale.lotId === id), 'Undo this lot’s sales before removing the purchase lot.');
  return { ...state, lots: state.lots.filter(lot => lot.id !== id) };
}

export function recordCollectionSale(state: CollectionState, sale: CollectionSale,
  nowISO = new Date().toISOString()): CollectionState {
  return validateState({ ...state, sales: [...state.sales, sale] }, nowISO);
}

export function undoCollectionSale(state: CollectionState, id: string): CollectionState {
  requireValue(state.sales.some(sale => sale.id === id), 'Sale not found.');
  return { ...state, sales: state.sales.filter(sale => sale.id !== id) };
}

export function summarizeCollection(state: CollectionState, products: readonly CollectionProduct[]): CollectionSummary {
  const result: CollectionSummary = { ownedUnits: 0, distinctProducts: 0, marketCents: 0, pricedUnits: 0,
    retailCents: 0, retailUnits: 0, paidCents: 0, costedUnits: 0, knownPacks: 0, packKnownUnits: 0,
    packCostCents: 0, packCostPacks: 0, unrealizedCents: 0, unrealizedUnits: 0, saleProceedsCents: 0,
    saleFeesCents: 0, realizedCents: 0, realizedUnits: 0, soldUnits: 0, setPacks: [] };
  const bySlug = new Map(products.map(product => [product.slug, product]));
  const byId = new Map(state.lots.map(lot => [lot.id, lot]));
  const sold = new Map<string, number>();
  for (const sale of state.sales) {
    sold.set(sale.lotId, (sold.get(sale.lotId) ?? 0) + sale.quantity);
    result.soldUnits += sale.quantity;
    result.saleProceedsCents += sale.proceedsCents;
    result.saleFeesCents += sale.feesCents;
    const lot = byId.get(sale.lotId);
    if (lot && lot.unitCostCents !== null) {
      result.realizedCents += sale.proceedsCents - sale.feesCents - lot.unitCostCents * sale.quantity;
      result.realizedUnits += sale.quantity;
    }
  }
  const slugs = new Set<string>();
  const sets = new Map<string, CollectionSummary['setPacks'][number]>();
  for (const lot of state.lots) {
    const quantity = lot.quantity - (sold.get(lot.id) ?? 0);
    if (!quantity) continue;
    slugs.add(lot.slug);
    const product = bySlug.get(lot.slug);
    const market = product ? cents(product.marketCents, 'Market price') : null;
    const retail = product ? cents(product.msrpCents, 'Retail price') : null;
    const packCount = packs(product ? product.packCount : lot.packCount);
    const setName = product?.setName ?? lot.setName ?? 'Unspecified set';
    const set = sets.get(setName) ?? { setName, packs: 0, units: 0, unknownPackUnits: 0 };
    set.units += quantity;
    result.ownedUnits += quantity;
    if (market !== null) { result.marketCents += market * quantity; result.pricedUnits += quantity; }
    if (retail !== null) { result.retailCents += retail * quantity; result.retailUnits += quantity; }
    if (lot.unitCostCents !== null) {
      result.paidCents += lot.unitCostCents * quantity; result.costedUnits += quantity;
      if (market !== null) {
        result.unrealizedCents += (market - lot.unitCostCents) * quantity; result.unrealizedUnits += quantity;
      }
    }
    if (packCount !== null) {
      const count = packCount * quantity;
      result.knownPacks += count; result.packKnownUnits += quantity; set.packs += count;
      if (lot.unitCostCents !== null) { result.packCostCents += lot.unitCostCents * quantity; result.packCostPacks += count; }
    } else { set.unknownPackUnits += quantity; }
    sets.set(setName, set);
  }
  result.distinctProducts = slugs.size;
  result.setPacks = [...sets.values()].sort((a, b) => b.packs - a.packs || a.setName.localeCompare(b.setName));
  return result;
}

export function recordCollectionSnapshot(state: CollectionState, products: readonly CollectionProduct[], nowISO: string): CollectionState {
  timestamp(nowISO, 'snapshot time');
  const totals = summarizeCollection(state, products);
  if (!totals.ownedUnits && !state.snapshots.length) return state;
  const quantities = new Map<string, number>();
  const sold = new Map<string, number>();
  for (const sale of state.sales) sold.set(sale.lotId, (sold.get(sale.lotId) ?? 0) + sale.quantity);
  for (const lot of state.lots) {
    const owned = lot.quantity - (sold.get(lot.id) ?? 0);
    if (owned) quantities.set(lot.slug, (quantities.get(lot.slug) ?? 0) + owned);
  }
  // A compact, deterministic non-security fingerprint keeps long histories bounded.
  const composition = JSON.stringify([...quantities].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  let first = 2166136261;
  let second = 5381;
  for (let i = 0; i < composition.length; i++) {
    const code = composition.charCodeAt(i);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  const holdingsKey = quantities.size ? `v1:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}:${totals.ownedUnits}:${quantities.size}` : '[]';
  const snapshot: CollectionSnapshot = { at: nowISO, marketCents: totals.marketCents,
    retailCents: totals.retailCents, units: totals.ownedUnits, pricedUnits: totals.pricedUnits,
    retailUnits: totals.retailUnits, holdingsKey };
  const latest = state.snapshots.at(-1);
  requireValue(!latest || Date.parse(nowISO) >= Date.parse(latest.at), 'Cannot record a snapshot before the latest observation.');
  const sameDay = latest?.at.slice(0, 10) === nowISO.slice(0, 10);
  if (sameDay && latest.marketCents === snapshot.marketCents && latest.retailCents === snapshot.retailCents
    && latest.units === snapshot.units && latest.pricedUnits === snapshot.pricedUnits
    && latest.retailUnits === snapshot.retailUnits && latest.holdingsKey === snapshot.holdingsKey) return state;
  const snapshots = [...(sameDay ? state.snapshots.slice(0, -1) : state.snapshots), snapshot].slice(-MAX_SNAPSHOTS);
  return { ...state, snapshots };
}
