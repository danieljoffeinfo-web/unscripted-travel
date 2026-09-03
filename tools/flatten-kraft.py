#!/usr/bin/env python3
"""Flatten the kraft sheet to a single uniform tone, keeping the book.

The booklet was photographed under a lamp, so the sheet carries a top-to-bottom
lighting grade — its top edge and its foot differ by more than a dozen levels.
That is invisible while the photograph is the whole hero, but the pinned stage
shows CSS fill above and below it, and no flat colour can meet both edges at
once: one of the two joins always reads as a band.

So the same correction build-hero.py applies for white is applied here for
kraft. A quadratic lighting field is fitted to the clean paper (the book and
the area its shadow falls into are excluded) and divided out, then the result
is scaled back to the sheet's own mean colour. Clean paper lands on one flat
kraft; the shadow, being a ratio below the field, keeps its falloff. The book
itself is untouched.

The printed tone is what --kraft must be set to in index.html.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

# (path, height to keep, book box) — the crops carry a mirror-tiled extension
# below the photograph which the flat fill now replaces, so it is cut here.
CROPS = [
    ('assets/booklet-wide.jpg',  1122, (782, 158, 1807,  958)),
    ('assets/booklet-tight.jpg', 1332, ( 87, 368, 1112, 1168)),
]


def flatten(im, book, target=None):
    a = np.asarray(im).astype(np.float64)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    # exclude the book, and the area its shadow spills into (right and down)
    lit = ~((xx >= book[0] - 40) & (xx <= book[2] + 150) &
            (yy >= book[1] - 40) & (yy <= book[3] + 150))
    xn, yn = xx / w - .5, yy / h - .5
    basis = np.stack([np.ones_like(xn), xn, yn, xn**2, xn * yn, yn**2], axis=-1)
    field = np.zeros_like(a)
    flat_basis = np.ascontiguousarray(basis.reshape(-1, 6))
    # numpy's Accelerate BLAS backend raises spurious FP warnings on a matmul
    # this size; the result is checked for finiteness below instead.
    with np.errstate(all='ignore'):
        for c in range(3):
            coef, *_ = np.linalg.lstsq(basis[lit], a[..., c][lit], rcond=None)
            field[..., c] = (flat_basis @ coef).reshape(h, w)
    if not np.isfinite(field).all():
        raise SystemExit('lighting field did not converge')
    # Both crops are normalised to ONE tone, not to each of their own means.
    # They are different regions of the same sheet and photograph at slightly
    # different exposures, so per-crop means would leave the two breakpoints
    # on visibly different browns and need a --kraft each.
    if target is None:
        target = a[lit].mean(axis=0)
    flat = np.clip(a / np.maximum(field, 1e-6) * target, 0, 255)
    keep = np.zeros((h, w), np.uint8)
    keep[book[1] + 2:book[3] - 2, book[0] + 2:book[2] - 2] = 255
    keep = np.asarray(Image.fromarray(keep)
                      .filter(ImageFilter.GaussianBlur(2.2))
                      ).astype(np.float64)[..., None] / 255.
    out = a * keep + flat * (1 - keep)
    return Image.fromarray(out.astype(np.uint8)), lit, target


shared = None
for path, keep_h, book in CROPS:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    im = im.crop((0, 0, w, keep_h))
    book = (book[0], book[1], book[2], min(book[3], keep_h))
    out, lit, shared = flatten(im, book, shared)

    a = np.asarray(out).astype(np.float64)
    # uniformity of the clean sheet, sampled clear of the book and its shadow
    tone = a[lit].mean(axis=0)
    hexs = '#%02X%02X%02X' % tuple(int(round(v)) for v in tone)
    # the two edges the CSS fill has to meet
    top = a[0:8][lit[0:8]].mean(axis=0)
    foot = a[keep_h - 8:][lit[keep_h - 8:]].mean(axis=0)
    print(f"{path}  {w}x{h} -> {w}x{keep_h}")
    print(f"   flat kraft  {hexs}  {tuple(int(round(v)) for v in tone)}")
    print(f"   sheet std   {a[lit].std(axis=0).mean():.2f} levels")
    print(f"   top edge    {tuple(int(round(v)) for v in top)}"
          f"   foot {tuple(int(round(v)) for v in foot)}"
          f"   delta {max(abs(top[i]-foot[i]) for i in range(3)):.1f}")
    out.save(path, 'JPEG', quality=90, optimize=True, progressive=True, subsampling=1)


# ── the fill tile ──────────────────────────────────────────────────────────
# The stage shows fill above and below the photograph. Matching only the tone
# is not enough: a dead flat fill against a grainy sheet still reads as a panel
# edge (measured std 0.7 against the photograph's 3.4). So the fill is the
# sheet itself — a clean patch, mirrored into a seamless tile. At this contrast
# the mirror symmetry is invisible; what carries is the grain.
patch = Image.open(CROPS[0][0]).convert('RGB').crop((120, 120, 520, 520))
w, h = patch.size
tile = Image.new('RGB', (w * 2, h * 2))
tile.paste(patch, (0, 0))
tile.paste(patch.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
tile.paste(patch.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
tile.paste(patch.transpose(Image.ROTATE_180), (w, h))
tile = tile.resize((400, 400), Image.LANCZOS)
tile.save('assets/kraft-tile.jpg', 'JPEG', quality=92, optimize=True, subsampling=1)

# It must be drawn at the same scale as the grain inside the photograph, and
# each crop is laid out full-bleed, so the size is a fraction of the viewport.
span = (patch.size[0] * 2)   # source pixels the tile covers
for path, _, _ in CROPS:
    native_w = Image.open(path).size[0]
    print(f"background-size for {path}: {span / native_w * 100:.4f}vw")
