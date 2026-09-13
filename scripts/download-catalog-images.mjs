import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const { items } = JSON.parse(await readFile(new URL('data/catalog-import.json', root), 'utf8'));
const dir = new URL('.catalog-cache/images/', root);
await mkdir(dir, { recursive: true });
let done = 0;
for (const item of items.filter(item => !item.existingId && item.sourceImageUrl && item.imageUrl)) {
  const file = new URL(`${item.sourceProductId}.jpg`, dir);
  try { await access(file); continue; } catch { /* Not cached yet. */ }
  let response = await fetch(item.sourceImageUrl, { headers: { 'User-Agent': 'PokeScratch/1.0 (catalog product imagery)' } });
  if (!response.ok) response = await fetch(item.sourceImageUrl.replace('_in_1000x1000', '_400w'));
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) { console.warn(`Photo unavailable: ${item.sourceProductId} ${item.name}`); continue; }
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  if (++done % 25 === 0) console.log(`${done} product photos saved`);
  await new Promise(resolve => setTimeout(resolve, 120));
}
console.log('Product photos downloaded.');
