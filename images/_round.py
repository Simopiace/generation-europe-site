"""Make favicon circular by applying a round alpha mask."""
from PIL import Image, ImageDraw
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, 'favicon.png')

img = Image.open(src).convert('RGBA')
w, h = img.size
size = min(w, h)
# Crop to a centered square if not already
left = (w - size) // 2
top = (h - size) // 2
img = img.crop((left, top, left + size, top + size))

# Build circular alpha mask at high res for smooth edges
mask = Image.new('L', (size, size), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((0, 0, size - 1, size - 1), fill=255)

# Apply mask
result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
result.paste(img, (0, 0), mask)
result.save(src, optimize=True)
print(f"favicon: {w}x{h} -> {size}x{size} circular, saved {src}")
