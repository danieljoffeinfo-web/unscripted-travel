#!/usr/bin/env python3
"""
Build the two hero crops from the client's cover artwork.

The source is a flat-lay photograph of the booklet on kraft paper. Neither the
desktop nor the mobile frame fits it as-shot, so both are grown outward by
mirror-tiling the *clean* kraft margins — never a flat CSS colour, which shows
a seam against the paper grain.

  booklet-wide.jpg   desktop: kraft extended left/right to bleed full-width,
                     plus a deep bottom margin for the fade into the page.
  booklet-tight.jpg  mobile:  tighter on the book, with headroom above for the
                     nav and the same deep bottom margin.

Usage:  python3 tools/build-hero.py "/path/to/Unscripted Travel .png"
"""
import sys, statistics
from PIL import Image

SRC   = sys.argv[1] if len(sys.argv) > 1 else '/Users/danieljoffe/Desktop/Unscripted Travel .png'
ALT   = '/Users/danieljoffe/Pictures/Photos Library.photoslibrary/originals/8/8F86429D-7591-4B82-9EDA-8413C4067FF6.jpeg'
BOOK  = (183, 158, 1208, 958)      # book bounding box in the source
ALT_BOOK = (533, 200, 1211, 732)   # same book, same mockup, in the alternate shot
ALT_GAIN = 1.1016                  # exposure delta between the two shots (WB matches)
WIDE_W, BOTTOM_EXT, TOP_EXT = 2600, 340, 210

src = Image.open(SRC).convert('RGB')
W, H = src.size


def clean_band(im, axis, ref_rows=30, tol=0.025):
    """Rows/cols of uninterrupted kraft at the far edge, excluding book + shadow."""
    w, h = im.size; px = im.load()
    if axis == 'bottom':
        mean = lambda y: statistics.mean(sum(px[x, y]) / 3 for x in range(0, w, 7))
        ref  = statistics.mean(mean(y) for y in range(h - ref_rows, h))
        edge = next(y for y in range(h - 1, 0, -1) if abs(mean(y) - ref) / ref > tol)
        return edge + 4
    mean = lambda y: statistics.mean(sum(px[x, y]) / 3 for x in range(0, w, 7))
    ref  = statistics.mean(mean(y) for y in range(ref_rows))
    edge = next(y for y in range(h) if abs(mean(y) - ref) / ref > tol)
    return edge - 4


def flatten_rows(band):
    """Remove a strip's own vertical gradient, keeping its grain.

    Mirror-tiling a strip that still carries a gradient produces a repeating
    light-dark-light banding. Normalising every row to the strip mean first
    means only the paper grain repeats, which is invisible.
    """
    import statistics as st
    w, h = band.size; px = band.load()
    rows = [st.mean(sum(px[x, y]) / 3 for x in range(0, w, 5)) for y in range(h)]
    target = st.mean(rows)
    for y in range(h):
        if rows[y] <= 0: continue
        k = target / rows[y]
        for x in range(w):
            r, g, b = px[x, y]
            px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
    return band


def tile(canvas, strip, start, direction, limit, horizontal):
    """Mirror-tile a strip away from the image so the join is pixel-identical."""
    sw, sh = strip.size
    span = sw if horizontal else sh
    pos, flip = start, True
    while (pos > limit) if direction < 0 else (pos < limit):
        mode  = Image.FLIP_LEFT_RIGHT if horizontal else Image.FLIP_TOP_BOTTOM
        piece = strip.transpose(mode) if flip else strip
        n = min(span, (pos - limit) if direction < 0 else (limit - pos))
        if direction < 0:
            box = (span - n, 0, span, sh) if horizontal else (0, span - n, sw, span)
            canvas.paste(piece.crop(box), (pos - n, 0) if horizontal else (0, pos - n))
            pos -= n
        else:
            box = (0, 0, n, sh) if horizontal else (0, 0, sw, n)
            canvas.paste(piece.crop(box), (pos, 0) if horizontal else (0, pos))
            pos += n
        flip = not flip


def vignette(im, region, depth=0.06):
    """Ease a gentle falloff into a grown margin so it reads as one photograph."""
    x0, y0, x1, y1 = region; px = im.load()
    vertical = (x1 - x0) == im.size[0]
    for y in range(y0, y1):
        for x in range(x0, x1):
            t = ((y1 - y) / (y1 - y0)) if vertical else 0
            k = 1.0 - depth * (t * t)
            r, g, b = px[x, y]
            px[x, y] = (int(r * k), int(g * k), int(b * k))


def grow_bottom(im, ext):
    band_y = clean_band(im, 'bottom')
    w, h   = im.size
    band   = flatten_rows(im.crop((0, band_y, w, h)).copy())
    out    = Image.new('RGB', (w, h + ext)); out.paste(im, (0, 0))
    tile(out, band, h, +1, h + ext, horizontal=False)
    vignette(out, (0, h, w, h + ext), depth=0.05)
    return out


# ── desktop ────────────────────────────────────────────────────────────────
pad  = (WIDE_W - W) // 2
wide = Image.new('RGB', (WIDE_W, H)); wide.paste(src, (pad, 0))
tile(wide, src.crop((0, 0, 178, H)),    pad,     -1, 0,      horizontal=True)
tile(wide, src.crop((1302, 0, W, H)),   pad + W, +1, WIDE_W, horizontal=True)
px = wide.load()
for x in list(range(pad)) + list(range(pad + W, WIDE_W)):
    t = (pad - x) / pad if x < pad else (x - (pad + W)) / (WIDE_W - (pad + W))
    k = 1.0 - 0.06 * (t * t)
    for y in range(H):
        r, g, b = px[x, y]; px[x, y] = (int(r * k), int(g * k), int(b * k))
wide = grow_bottom(wide, BOTTOM_EXT)
wide.save('assets/booklet-wide.jpg', quality=86, optimize=True, progressive=True)

# ── mobile ─────────────────────────────────────────────────────────────────
bx0, by0, bx1, by1 = BOOK
mx = int((bx1 - bx0) * 0.085)
tight = src.crop((max(0, bx0 - mx), 0, min(W, bx1 + mx), H))   # all available kraft
tw, th = tight.size
head = Image.new('RGB', (tw, th + TOP_EXT)); head.paste(tight, (0, TOP_EXT))
tile(head, flatten_rows(tight.crop((0, 0, tw, clean_band(tight, 'top'))).copy()),
     TOP_EXT, -1, 0, horizontal=False)
px = head.load()
for y in range(TOP_EXT):
    k = 1.0 - 0.05 * (((TOP_EXT - y) / TOP_EXT) ** 2)
    for x in range(tw):
        r, g, b = px[x, y]; px[x, y] = (int(r * k), int(g * k), int(b * k))
tight = grow_bottom(head, 240)
tight.save('assets/booklet-tight.jpg', quality=88, optimize=True, progressive=True)


# ── alternate cover ────────────────────────────────────────────────────────
# The alternate shot is the same mockup photographed at a different distance.
# Scale it so its book lands exactly on BOOK, match exposure, and export only
# the book: the kraft, spine shadow and framing all stay with the base crops,
# so the two states differ by nothing except the printed cover.
alt = Image.open(ALT).convert('RGB')
sx  = (BOOK[2] - BOOK[0]) / (ALT_BOOK[2] - ALT_BOOK[0])
sy  = (BOOK[3] - BOOK[1]) / (ALT_BOOK[3] - ALT_BOOK[1])
res = alt.resize((round(alt.size[0] * sx), round(alt.size[1] * sy)), Image.LANCZOS)
ox, oy = round(ALT_BOOK[0] * sx) - BOOK[0], round(ALT_BOOK[1] * sy) - BOOK[1]
cover = res.crop((ox + BOOK[0], oy + BOOK[1], ox + BOOK[2], oy + BOOK[3]))
px = cover.load()
for y in range(cover.size[1]):
    for x in range(cover.size[0]):
        r, g, b = px[x, y]
        px[x, y] = (min(255, int(r * ALT_GAIN)),
                    min(255, int(g * ALT_GAIN)),
                    min(255, int(b * ALT_GAIN)))
cover.save('assets/cover-penguin.jpg', quality=88, optimize=True, progressive=True)

bw, bh = BOOK[2] - BOOK[0], BOOK[3] - BOOK[1]
pad_x  = (WIDE_W - W) // 2
mx     = int(bw * 0.085)
tw     = min(W, BOOK[2] + mx) - max(0, BOOK[0] - mx)

print('booklet-wide.jpg ', wide.size)
print('booklet-tight.jpg', tight.size)
print('cover-penguin.jpg', cover.size)
print()
print('CSS geometry for the overlay (percentages of each crop):')
print('  desktop  left %.4f%%  top %.4f%%  width %.4f%%  height %.4f%%' % (
    (BOOK[0] + pad_x) / WIDE_W * 100, BOOK[1] / wide.size[1] * 100,
    bw / WIDE_W * 100, bh / wide.size[1] * 100))
print('  mobile   left %.4f%%  top %.4f%%  width %.4f%%  height %.4f%%' % (
    (BOOK[0] - max(0, BOOK[0] - mx)) / tw * 100, (BOOK[1] + TOP_EXT) / tight.size[1] * 100,
    bw / tw * 100, bh / tight.size[1] * 100))
