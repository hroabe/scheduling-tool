"""Generate placeholder app icons / splash (calendar with a check mark, brand blue #0967D2).

Usage (from mobile/):  python scripts/generate_assets.py   (requires Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

BLUE = (9, 103, 210, 255)
DARK_BLUE = (3, 68, 158, 255)
WHITE = (255, 255, 255, 255)
LIGHT = (235, 244, 255, 255)
ASSETS = Path(__file__).resolve().parent.parent / 'assets'
SS = 4  # supersampling factor for smooth edges


def draw_calendar(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float, fg=WHITE, accent=BLUE) -> None:
    """Calendar glyph of width `size` centred at (cx, cy)."""
    w = size
    h = size * 0.9
    left, top = cx - w / 2, cy - h / 2 + size * 0.04
    right, bottom = left + w, top + h
    r = size * 0.12
    # body
    draw.rounded_rectangle([left, top, right, bottom], radius=r, fill=fg)
    # header band
    band = top + h * 0.26
    draw.rounded_rectangle([left, top, right, band + r], radius=r, fill=LIGHT if fg == WHITE else fg)
    draw.rectangle([left, band, right, band + r], fill=fg)
    # rings
    ring_w, ring_h = size * 0.075, size * 0.2
    for x in (left + w * 0.28, right - w * 0.28):
        draw.rounded_rectangle(
            [x - ring_w / 2, top - ring_h * 0.45, x + ring_w / 2, top + ring_h * 0.55],
            radius=ring_w / 2,
            fill=DARK_BLUE if fg == WHITE else accent,
        )
    # check mark
    stroke = size * 0.1
    points = [
        (left + w * 0.27, top + h * 0.62),
        (left + w * 0.45, top + h * 0.79),
        (left + w * 0.76, top + h * 0.42),
    ]
    draw.line(points, fill=accent, width=int(stroke), joint='curve')
    for x, y in (points[0], points[-1]):
        draw.ellipse([x - stroke / 2, y - stroke / 2, x + stroke / 2, y + stroke / 2], fill=accent)


def render(size: int, bg, glyph_ratio: float, rounded: bool = False) -> Image.Image:
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0) if bg is None else bg)
    draw = ImageDraw.Draw(img)
    if rounded:
        img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([0, 0, big, big], radius=big * 0.22, fill=BLUE)
    draw_calendar(draw, big / 2, big / 2, big * glyph_ratio)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    # iOS/Android store icon: full-bleed, no transparency
    render(1024, BLUE, 0.56).convert('RGB').save(ASSETS / 'icon.png', optimize=True)
    # Android adaptive foreground: transparent, glyph inside the 66% safe zone
    render(1024, None, 0.42).save(ASSETS / 'adaptive-icon.png', optimize=True)
    # Splash image (shown centred on the blue splash background from app.json)
    render(1024, None, 0.5).save(ASSETS / 'splash.png', optimize=True)
    # Web favicon
    render(48, None, 0.9, rounded=True).save(ASSETS / 'favicon.png', optimize=True)
    for name in ('icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png'):
        with Image.open(ASSETS / name) as im:
            print(f'{name}: {im.size[0]}x{im.size[1]} {im.mode}')


if __name__ == '__main__':
    main()
