"""Build tightly cropped, transparent WebP derivatives from product source photos.

The source JPEGs remain untouched. Near-white pixels are removed only when they
are connected to an image edge, which preserves white printing inside packaging.
Flat, full-frame package shots are converted without background removal because
the rectangle is the product itself.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_ROOT / "public" / "product-images"
OUTPUT_DIR = SOURCE_DIR / "cutouts"

PRESERVE_RECTANGLE = {
    "151-costco-mini-tins",
    "151-sams-mini-tin-bundle",
    "blooming-waters-premium",
    "destined-rivals-kangaskhan-blister",
    "mega-kangaskhan-ex-box",
    "surging-sparks-etb",
}


def edge_background_mask(image: Image.Image) -> bytearray:
    width, height = image.size
    pixels = image.load()
    candidates = bytearray(width * height)

    for y in range(height):
        offset = y * width
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            minimum = min(red, green, blue)
            chroma = max(red, green, blue) - minimum
            if minimum >= 215 and chroma <= 42:
                candidates[offset + x] = 1

    background = bytearray(width * height)
    queue: deque[int] = deque()

    def add(index: int) -> None:
        if candidates[index] and not background[index]:
            background[index] = 1
            queue.append(index)

    for x in range(width):
        add(x)
        add((height - 1) * width + x)
    for y in range(height):
        add(y * width)
        add(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if x:
            add(index - 1)
        if x + 1 < width:
            add(index + 1)
        if y:
            add(index - width)
        if y + 1 < height:
            add(index + width)

    return background


def make_cutout(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    width, height = image.size

    if source.stem not in PRESERVE_RECTANGLE:
        pixels = image.load()
        background = edge_background_mask(image)

        for y in range(height):
            for x in range(width):
                index = y * width + x
                if not background[index]:
                    continue

                red, green, blue, _ = pixels[x, y]
                distance_from_white = 255 - min(red, green, blue)
                chroma = max(red, green, blue) - min(red, green, blue)
                alpha = round((distance_from_white * 1.6 + chroma * 0.8 - 3) * 6)
                pixels[x, y] = (red, green, blue, max(0, min(255, alpha)))

        bounds = image.getbbox()
        if bounds:
            left, top, right, bottom = bounds
            padding = max(8, round(max(right - left, bottom - top) * 0.035))
            image = image.crop(
                (
                    max(0, left - padding),
                    max(0, top - padding),
                    min(width, right + padding),
                    min(height, bottom + padding),
                )
            )

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=92, method=6, exact=True)


def main() -> None:
    sources = sorted(SOURCE_DIR.glob("*.jpg"))
    for source in sources:
        destination = OUTPUT_DIR / f"{source.stem}.webp"
        make_cutout(source, destination)
        print(destination.relative_to(PROJECT_ROOT))


if __name__ == "__main__":
    main()
