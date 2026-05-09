"""Crop white/transparent padding from banner logos. Keeps only the midnight-blue area."""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
WHITE_THRESHOLD = 230

def is_background_row(pixels, y, width, mode):
    for x in range(0, width, max(1, width // 60)):
        p = pixels[x, y]
        if mode == "RGBA":
            r, g, b, a = p
            if a < 30:
                continue  # transparent = background
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                continue  # white = background
            return False
        else:
            r, g, b = p[:3]
            if not (r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD):
                return False
    return True

def crop_padding(in_name, out_name):
    path_in = os.path.join(HERE, in_name)
    img = Image.open(path_in)
    print(f"{in_name}: mode={img.mode} size={img.size}")
    w, h = img.size
    px = img.load()
    top = 0
    while top < h and is_background_row(px, top, w, img.mode):
        top += 1
    bottom = h - 1
    while bottom > top and is_background_row(px, bottom, w, img.mode):
        bottom -= 1
    if bottom <= top + 5:
        print(f"  -> no crop detected")
        return
    cropped = img.crop((0, top, w, bottom + 1))
    # Composite onto white if RGBA so the transparent areas become white
    if cropped.mode == "RGBA":
        bg = Image.new("RGB", cropped.size, (255, 255, 255))
        bg.paste(cropped, mask=cropped.split()[3])
        cropped = bg
    cropped.save(os.path.join(HERE, out_name), optimize=True)
    print(f"  -> cropped to {cropped.size[0]}x{cropped.size[1]}, saved {out_name}")

crop_padding("IMG_6308.PNG", "IMG_6308.PNG")
crop_padding("IMG_6309.PNG", "IMG_6309.PNG")
crop_padding("IMG_6310.PNG", "IMG_6310.PNG")
print("done")
