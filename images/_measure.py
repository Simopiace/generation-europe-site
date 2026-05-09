"""Measure where the center of 'u' (x-height letters) sits in logo.png."""
from PIL import Image
from collections import Counter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
img = Image.open(os.path.join(HERE, 'logo.png')).convert('RGBA')
w, h = img.size
px = img.load()

def is_ink(p):
    r, g, b, a = p
    return a > 100 and (r + g + b) / 3 < 100

column_top = []
column_bottom = []
for x in range(w):
    top = None
    bottom = None
    for y in range(h):
        if is_ink(px[x, y]):
            if top is None:
                top = y
            bottom = y
    column_top.append(top)
    column_bottom.append(bottom)

top_counter = Counter([t for t in column_top if t is not None])
bottom_counter = Counter([b for b in column_bottom if b is not None])

print(f"Image: {w}x{h}")
print(f"Geometric center y: {h/2:.1f}")
print(f"Top-y mode (x-height line): {top_counter.most_common(3)}")
print(f"Bottom-y mode (baseline): {bottom_counter.most_common(3)}")

x_height_y = top_counter.most_common(1)[0][0]
baseline_y = bottom_counter.most_common(1)[0][0]
center_u_y = (x_height_y + baseline_y) / 2
print(f"x-height top: {x_height_y}")
print(f"Baseline: {baseline_y}")
print(f"Center of u/e/n: {center_u_y:.1f}")
print(f"Offset from geometric center: {center_u_y - h/2:+.1f}px (positive = below)")

# At rendered height 32px (mobile), how much offset in CSS pixels?
scale = 32 / h
print(f"\nAt 32px CSS height: scale={scale:.4f}")
print(f"Center of u offset in CSS px: {(center_u_y - h/2) * scale:+.2f}px")
print(f"To put u-center at flex center (translate(0)), need translateY({-(center_u_y - h/2) * scale:+.2f}px)")
