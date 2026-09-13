"""Create local, cropped photo derivatives; preserve original downloads and source mapping."""
import importlib.util
import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cutouts", ROOT / "scripts/build-product-cutouts.py")
cutouts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutouts)

def process(item):
    src = ROOT / f'.catalog-cache/images/{item["sourceProductId"]}.jpg'
    dst = ROOT / 'public' / item['imageUrl'].lstrip('/')
    if not dst.exists():
        cutouts.make_cutout(src, dst)
    with Image.open(src) as image:
        return {"productId": item['id'], "source": item['sourceImageUrl'], "sourceDimensions": list(image.size), "asset": item['imageUrl']}

if __name__ == '__main__':
    data = json.loads((ROOT / 'data/catalog-import.json').read_text())
    (ROOT / 'public/product-images/catalog').mkdir(parents=True, exist_ok=True)
    with ProcessPoolExecutor(max_workers=4) as pool:
        manifest = list(pool.map(process, [p for p in data['items'] if not p['existingId'] and p['imageUrl']]))
    (ROOT / 'data/catalog-image-provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Optimized {len(manifest)} exact-product images.')
