"""Extract the existing Concept 04 mascot pixels; no image generation or upscaling.

Usage: python scripts/crop-mascot.py INPUT_PNG OUTPUT_PNG
The crop is measured against the original 1536 x 1024 concept image.
"""
import sys
from collections import deque
from PIL import Image, ImageOps, PngImagePlugin

source = Image.open(sys.argv[1]).convert("RGB")
if source.size != (1536, 1024):
    raise ValueError("Expected the original 1536 x 1024 Concept 04 image")
crop = source.crop((46, 350, 237, 526))
width, height = crop.size
pixels = crop.load()
# The source has a cool navy background and a warm yellow/brown subject.
# Preserve the real silhouette using pixel color, including the dark ear tips.
mask = Image.new("L", crop.size)
alpha = mask.load()
for y in range(height):
    for x in range(width):
        r, g, b = pixels[x, y]
        alpha[x, y] = 255 if r - b > 5 and g - b > 2 else 0
# Fill only enclosed holes (eyes, mouth, dark interior details), never the
# external gaps between the ears, tail, and body.
outside = set()
queue = deque([(x, y) for x in range(width) for y in (0, height - 1)] + [(x, y) for y in range(height) for x in (0, width - 1)])
while queue:
    x, y = queue.popleft()
    if (x, y) in outside or not (0 <= x < width and 0 <= y < height) or alpha[x, y]:
        continue
    outside.add((x, y))
    queue.extend(((x-1, y), (x+1, y), (x, y-1), (x, y+1)))
for y in range(height):
    for x in range(width):
        if (x, y) not in outside:
            alpha[x, y] = 255
result = crop.convert("RGBA")
result.putalpha(mask)
result = ImageOps.mirror(result)
result = ImageOps.expand(result, border=6, fill=(0, 0, 0, 0))
metadata = PngImagePlugin.PngInfo()
metadata.add_text("Source", "Previously generated PokeScratch Concept 04 (1536x1024), user-selected existing image")
metadata.add_text("Editing", "Crop [46,350,237,526], pixel-derived cool-background removal, horizontal mirror, transparent padding. No new generated pixels or upscaling.")
result.save(sys.argv[2], pnginfo=metadata, optimize=True)
print(f"Saved {result.width}x{result.height} transparent mascot")
