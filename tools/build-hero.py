#!/usr/bin/env python3
"""
Build the hero crops from the client's cover artwork.

The source is a flat-lay of the booklet on kraft paper. Three things happen:

1. The paper is turned bright white. A quadratic lighting field is fitted to
   the clean paper only (the book and the area its shadow falls into are
   excluded), then every background pixel is divided by that field. Clean paper
   lands on white; the shadow keeps its falloff and becomes a soft neutral grey.
   The book itself is left exactly as shot.
2. The desktop frame is widened so the sheet bleeds full width. Because step 1
   leaves the paper uniform (std well under one level), the margin is extended
   with a flat fill sampled from the clean edge — mirror-tiling grain that no
   longer exists only reintroduced banding. The mobile frame is instead cropped
   close to the book; the pinned stage centres it and supplies the white around
   it, so baked-in margin would only push the book off-centre.
3. The alternate cover is scaled until its book lands exactly on this one's, so
   the two states differ by nothing but the printed cover.

Usage:  python3 tools/build-hero.py ["/path/to/Unscripted Travel .png"]
"""
import sys, statistics
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else \
    '/Users/danieljoffe/Desktop/Clients 🔒/Unscripted Travel/Unscripted Travel .png'
ALT = '/Users/danieljoffe/Pictures/Photos Library.photoslibrary/originals/8/8F86429D-7591-4B82-9EDA-8413C4067FF6.jpeg'

BOOK      = (183, 158, 1208, 958)   # book bounding box in the source
ALT_BOOK  = (533, 200, 1211, 732)   # the same book in the alternate shot
ALT_GAIN  = 1.1016                  # exposure delta between the two shots
WIDE_W = 2600
MARGIN_X, MARGIN_TOP, MARGIN_BOT = 0.085, 0.085, 100   # mobile crop, around the book
PAPER_GAIN = 1.015                  # nudges clean paper onto pure white

src = Image.open(SRC).convert('RGB')
W, H = src.size


def whiten(im, book):
    """Turn the paper white, keeping the book and its shadow."""
    a = np.asarray(im).astype(np.float64)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    # exclude the book, and the area its shadow spills into (right and down)
    lit = ~((xx >= book[0] - 40) & (xx <= book[2] + 150) &
            (yy >= book[1] - 40) & (yy <= book[3] + 150))
    xn, yn = xx / w - .5, yy / h - .5
    basis = np.stack([np.ones_like(xn), xn, yn, xn**2, xn * yn, yn**2], axis=-1)
    field = np.empty_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(basis[lit], a[..., c][lit], rcond=None)
        field[..., c] = basis @ coef
    ratio = np.clip(a / np.maximum(field, 1e-6), 0, 1.6)
    white = np.clip(ratio.mean(axis=-1, keepdims=True) * 255.0 * PAPER_GAIN, 0, 255)
    # Dividing by a darker part of the lighting field amplifies its noise, which
    # on a near-white sheet shows as blotching and, once the margins are tiled,
    # as banding. Pull the highlights the rest of the way to white on a smooth
    # ramp: paper lands flat, the shadow and its penumbra keep their falloff.
    t = np.clip((white - 196.0) / 42.0, 0, 1)
    t = t * t * (3 - 2 * t)
    white = (white + (255.0 - white) * t).repeat(3, axis=-1)
    keep = np.zeros((h, w), np.uint8)
    keep[book[1] + 2:book[3] - 2, book[0] + 2:book[2] - 2] = 255
    keep = np.asarray(Image.fromarray(keep).filter(ImageFilter.GaussianBlur(2.2))
                      ).astype(np.float64)[..., None] / 255.
    return Image.fromarray((a * keep + white * (1 - keep)).astype(np.uint8)), lit


src, lit_mask = whiten(src, BOOK)


def edge_fill(im, box):
    """Mean colour of a clean strip of paper, as an integer RGB tuple."""
    a = np.asarray(im.crop(box)).astype(np.float64)
    return tuple(int(round(v)) for v in a.reshape(-1, 3).mean(axis=0))


def grow(im, top=0, bottom=0, left=0, right=0):
    """Extend the sheet outward with flat paper sampled from each clean edge."""
    w, h = im.size
    out = Image.new('RGB', (w + left + right, h + top + bottom), (255, 255, 255))
    if top:    out.paste(Image.new('RGB', (out.size[0], top),    edge_fill(im, (0, 0, w, 40))),            (0, 0))
    if bottom: out.paste(Image.new('RGB', (out.size[0], bottom), edge_fill(im, (0, h - 40, w, h))),        (0, h + top))
    if left:   out.paste(Image.new('RGB', (left, out.size[1]),   edge_fill(im, (0, 0, 40, h))),            (0, 0))
    if right:  out.paste(Image.new('RGB', (right, out.size[1]),  edge_fill(im, (w - 40, 0, w, h))),        (w + left, 0))
    out.paste(im, (left, top))
    return out


# ── desktop ────────────────────────────────────────────────────────────────
pad = (WIDE_W - W) // 2
wide = grow(src, left=pad, right=WIDE_W - W - pad)
wide.save('assets/booklet-wide.jpg', quality=90, optimize=True, progressive=True)

# ── mobile ─────────────────────────────────────────────────────────────────
mx = int((BOOK[2] - BOOK[0]) * MARGIN_X)
my = int((BOOK[3] - BOOK[1]) * MARGIN_TOP)
crop = (max(0, BOOK[0] - mx), max(0, BOOK[1] - my),
        min(W, BOOK[2] + mx), min(H, BOOK[3] + MARGIN_BOT))
tight = src.crop(crop)
tw, th = tight.size
tight.save('assets/booklet-tight.jpg', quality=90, optimize=True, progressive=True)

# ── alternate cover ────────────────────────────────────────────────────────
alt = Image.open(ALT).convert('RGB')
sx = (BOOK[2] - BOOK[0]) / (ALT_BOOK[2] - ALT_BOOK[0])
sy = (BOOK[3] - BOOK[1]) / (ALT_BOOK[3] - ALT_BOOK[1])
res = alt.resize((round(alt.size[0] * sx), round(alt.size[1] * sy)), Image.LANCZOS)
ox, oy = round(ALT_BOOK[0] * sx) - BOOK[0], round(ALT_BOOK[1] * sy) - BOOK[1]
cover = res.crop((ox + BOOK[0], oy + BOOK[1], ox + BOOK[2], oy + BOOK[3]))
cover = Image.fromarray(np.clip(np.asarray(cover).astype(np.float64) * ALT_GAIN,
                                0, 255).astype(np.uint8))
cover.save('assets/cover-penguin.jpg', quality=90, optimize=True, progressive=True)

bw, bh = BOOK[2] - BOOK[0], BOOK[3] - BOOK[1]
paper = np.asarray(wide.convert('L')).astype(np.float64)
print('booklet-wide.jpg ', wide.size)
print('booklet-tight.jpg', tight.size)
print('cover-penguin.jpg', cover.size)
print('paper level      : mean %.1f  (255 = pure white)' % paper[:80].mean())
print()
print('CSS geometry for the overlay (percentages of each crop):')
print('  desktop  left %.4f%%  top %.4f%%  width %.4f%%  height %.4f%%' % (
    (BOOK[0] + pad) / WIDE_W * 100, BOOK[1] / wide.size[1] * 100,
    bw / WIDE_W * 100, bh / wide.size[1] * 100))
print('  mobile   left %.4f%%  top %.4f%%  width %.4f%%  height %.4f%%' % (
    (BOOK[0] - crop[0]) / tw * 100, (BOOK[1] - crop[1]) / th * 100,
    bw / tw * 100, bh / th * 100))
