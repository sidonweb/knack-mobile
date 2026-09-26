"""Knack app icon: a geometric K with a spark, white on an ember gradient."""
import math, sys
from PIL import Image, ImageDraw, ImageFilter

# Usage: python scripts/generate-icon.py assets/images   (needs Pillow)
OUT = sys.argv[1]
SS = 4  # supersampling

TOP = (255, 122, 69)     # light ember
MID = (232, 68, 22)      # ember
BOT = (176, 38, 10)      # deep ember

def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(size):
    """Diagonal ember gradient, top-left light to bottom-right deep, with a soft top glow."""
    small = 256
    g = Image.new('RGB', (small, small))
    px = g.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            c = lerp(TOP, MID, t / 0.55) if t < 0.55 else lerp(MID, BOT, (t - 0.55) / 0.45)
            px[x, y] = c
    g = g.resize((size, size), Image.BICUBIC)
    glow = Image.new('L', (size, size), 0)
    ImageDraw.Draw(glow).ellipse((-size * .25, -size * .45, size * .85, size * .45), fill=60)
    glow = glow.filter(ImageFilter.GaussianBlur(size * .12))
    return Image.composite(Image.new('RGB', (size, size), (255, 214, 190)), g, glow)

def capsule(d, p1, p2, w, fill):
    """A stroke with round caps from p1 to p2."""
    (x1, y1), (x2, y2) = p1, p2
    L = math.hypot(x2 - x1, y2 - y1)
    nx, ny = -(y2 - y1) / L * w / 2, (x2 - x1) / L * w / 2
    d.polygon([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)], fill=fill)
    for (x, y) in (p1, p2):
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=fill)

def sparkle(d, cx, cy, r, fill):
    """Four-point star with concave sides."""
    pts = []
    for i in range(720):
        a = i / 720 * 2 * math.pi
        # astroid-like: sharp points on axes, pinched between
        c, s = math.cos(a), math.sin(a)
        k = 1 / (abs(c) ** 0.58 + abs(s) ** 0.58) ** (1 / 0.58)
        pts.append((cx + r * c * k * 1.0, cy + r * s * k * 1.0))
    d.polygon(pts, fill=fill)

def mark(size, scale, fill=(255, 255, 255, 255)):
    """The K + spark, centred, occupying `scale` of the canvas width. Transparent background."""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S * scale  # mark box
    ox, oy = (S - u) / 2 - u * 0.04, (S - u) / 2 + u * 0.01
    P = lambda x, y: (ox + x * u, oy + y * u)
    w = u * 0.17
    stem_x = 0.22
    capsule(d, P(stem_x, 0.14), P(stem_x, 0.86), w, fill)          # stem
    joint = P(stem_x, 0.58)
    capsule(d, joint, P(0.63, 0.27), w, fill)                      # upper arm
    capsule(d, P(0.45, 0.43), P(0.74, 0.86), w, fill)              # leg
    sparkle(d, *P(0.87, 0.11), u * 0.14, fill)                     # the spark
    return im.resize((size, size), Image.LANCZOS)

def rounded_mask(size, radius_frac):
    S = size * SS
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=S * radius_frac, fill=255)
    return m.resize((size, size), Image.LANCZOS)

def full_icon(size, rounded=False):
    bg = gradient(size).convert('RGBA')
    # subtle drop shadow under the mark for depth
    m = mark(size, 0.56)
    shadow = Image.new('RGBA', (size, size), (90, 20, 0, 0))
    shadow.putalpha(m.getchannel('A').point(lambda a: a * 0.35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.018))
    bg.alpha_composite(shadow, (0, round(size * 0.012)))
    bg.alpha_composite(m)
    if rounded:
        bg.putalpha(rounded_mask(size, 0.225))
    return bg

full_icon(1024).save(f'{OUT}/icon.png')
full_icon(1024, rounded=True).save(f'{OUT}/splash-icon.png')
full_icon(48, rounded=True).save(f'{OUT}/favicon.png')
gradient(512).convert('RGBA').save(f'{OUT}/android-icon-background.png')
# Adaptive icon: keep the mark inside the 66% safe zone.
mark(512, 0.40).save(f'{OUT}/android-icon-foreground.png')
mark(432, 0.40).save(f'{OUT}/android-icon-monochrome.png')
print('ok')
