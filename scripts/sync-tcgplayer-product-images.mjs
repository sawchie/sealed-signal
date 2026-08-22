import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceManifest = await readFile(
  new URL("../data/tcgplayer-image-sources.ts", import.meta.url),
  "utf8",
);
const images = Object.fromEntries(
  [...sourceManifest.matchAll(/"([^"]+)": (\d+),/g)].map(([, id, productId]) => [id, Number(productId)]),
);

const outputDirectory = new URL("../public/product-images/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const failures = [];
await Promise.all(
  Object.entries(images).map(async ([id, tcgplayerProductId]) => {
    const source = `https://product-images.tcgplayer.com/fit-in/1000x1000/${tcgplayerProductId}.jpg`;
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await writeFile(new URL(`${id}.jpg`, outputDirectory), Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      failures.push({ id, source, error: String(error) });
    }
  }),
);

if (failures.length) {
  process.stderr.write(`${JSON.stringify(failures, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Synced ${Object.keys(images).length} TCGplayer product images.\n`);
}
