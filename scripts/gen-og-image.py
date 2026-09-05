"""Generates public/og.png — the 1200x630 social preview used by every page.

Static (not next/og at request time) on purpose: the copy is English-only
brand chrome, so one PNG serves all 34 locales without shipping a font per
script. Re-run after a brand/palette change:  python3 scripts/gen-og-image.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "og.png")
SF = "/System/Library/Fonts/SFNS.ttf"  # SF Pro (macOS)

W, H = 1200, 630
BG = (249, 246, 241)        # --bg, warm paper
TEXT = (21, 18, 15)         # --text
HINT = (114, 106, 96)       # --hint
ACCENT = (217, 83, 79)      # brand red #d9534f, solid (no gradient)


def sf(size, weight="Regular"):
    f = ImageFont.truetype(SF, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def gradient(w, h, radius):
    """Solid rounded-square brand tile (same as LogoIcon's fill)."""
    tile = Image.new("RGB", (w, h), ACCENT)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=255)
    return tile, mask


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Logo tile with the "IQ" mark, same proportions as public/icon-512.png.
TILE = 132
tile, mask = gradient(TILE, TILE, radius=TILE * 96 // 512)
img.paste(tile, (96, 96), mask)
td = ImageDraw.Draw(img)
td.text((96 + TILE / 2, 96 + TILE / 2), "IQ", font=sf(76, "Bold"), fill=(255, 255, 255), anchor="mm")

d.text((96 + TILE + 28, 96 + TILE / 2), "IQ Mermaid", font=sf(52, "Semibold"), fill=TEXT, anchor="lm")

d.text((96, 352), "Draw it. Or write it.", font=sf(76, "Bold"), fill=TEXT, anchor="ls")
d.text((96, 432), "Free mermaid live editor — visual canvas and", font=sf(36), fill=HINT, anchor="ls")
d.text((96, 482), "mermaid code, always in sync. No sign-up.", font=sf(36), fill=HINT, anchor="ls")

# Brand accent bar, bottom-left (mirrors the hero's accent underline).
bar, bar_mask = gradient(220, 12, radius=6)
img.paste(bar, (96, 534), bar_mask)

img.save(OUT, "PNG", optimize=True)
print("wrote", os.path.normpath(OUT), img.size)
