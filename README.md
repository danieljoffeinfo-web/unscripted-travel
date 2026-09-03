# Unscripted Travel

Static site. No build step — open `index.html`, or deploy the folder as-is.

## Before launch — what still needs real content

| Where | What to replace |
|---|---|
| `assets/` + `.plate` blocks | **7 photographs.** Each placeholder states the shot and the aspect ratio it is cut for. |
| "In their words" section | The placeholder quote and attribution — currently marked `placeholder` on purpose. |
| Footer | `hello@unscriptedtravel.co.za`, `+27 00 000 0000`, Instagram and WhatsApp links. |
| `FORM_ENDPOINT` in the script | Enquiry destination. **Left empty it falls back to opening a pre-filled email**, so the form works either way. |

## Swapping a photograph

Replace the placeholder div with an image; the frame, ratio and caption stay as they are:

```html
<!-- before -->
<div class="plate"><p class="plate__fpo">The Winelands<br>4:5 · portrait</p></div>

<!-- after -->
<div class="plate"><img src="assets/winelands.jpg" alt="Vineyards above Franschhoek at dusk."></div>
```

Shots needed, in page order:

1. Table Mountain — **16:9 landscape** (full-width lead plate)
2. The Winelands — 4:5 portrait
3. Cape Peninsula — 4:5 portrait
4. Bo-Kaap — 4:5 portrait
5. Simon's Town — 4:5 portrait
6. Kirstenbosch — 4:5 portrait
7. Atlantic Seaboard — 4:5 portrait

## Hero assets

Cut from the client's two cover photographs by `tools/build-hero.py`, then
flattened by `tools/flatten-kraft.py`. The masters live in
`~/Desktop/Clients 🔒/Unscripted Travel/` and are not committed; pass a path as
the first argument if they move.

- `booklet-wide.jpg` — 2600×1122, desktop. Paper extended left/right so the
  sheet bleeds full width.
- `booklet-tight.jpg` — 1199×1332, mobile (≤700px). Cropped close to the book.
- `cover-penguin.jpg` — 1025×800, the alternate cover only.
- `kraft-tile.jpg` — 400×400, the seamless sheet the hero stage fills with.

The photograph carries the wordmark, so there is deliberately no headline typed
over it.

### Flattening the kraft

The booklet was shot on kraft under a lamp, so the sheet carries a
top-to-bottom lighting grade — its top edge and its foot differ by more than a
dozen levels. That is invisible while the photograph is the whole hero, but the
pinned stage is taller than the photograph and shows fill above and below it,
and no flat colour can meet both edges at once: one of the two joins always
reads as a band across the stage.

`tools/flatten-kraft.py` fits a quadratic lighting field to the clean paper —
the book and the area its shadow falls into are excluded — and divides it out,
then scales the result back to the sheet's own mean colour. Clean paper lands
on one flat kraft; the shadow, being a ratio below the field, keeps its
falloff. The book itself is untouched. After it runs the two edges differ by
1.6 levels (wide) and 2.2 (tight), down from thirteen.

Three things follow from it, and the script prints all of them:

- **Both crops are normalised to one tone**, not to each of their own means.
  They are different regions of the same sheet at slightly different exposures,
  so per-crop means would leave the two breakpoints on visibly different browns
  and need a `--kraft` each. That shared tone is `--kraft`.
- **The mirror-tiled extension is cut off.** Earlier builds grew each crop
  downward by mirror-tiling its bottom margin, which left a visible seam and a
  smeared band across the lower third. The stage fill covers that area now, so
  the tiling is gone and the crops end where the photograph does.
- **The fill is the sheet, not a colour.** Matching the tone alone still read as
  a panel — flat fill measured std 0.7 against the photograph's 3.4 — so a
  clean patch is mirrored into a seamless tile and drawn at the same scale the
  grain has inside the photograph. Because each crop is laid out full-bleed
  that scale is a fraction of the viewport: `30.7692vw` for the wide crop,
  `66.7223vw` for the tight one.

If you change the crops, re-run it and paste the tone and the two sizes it
prints into `:root` and `.hero__stage` in `index.html`.

### Scrolling into the site

The hero is a 170vh section with a pinned stage. Scrolling through it scales the book slightly and fades it into the white page, so reaching the content reads as a continuation rather than a cut. Transform and opacity only, written once per frame from a rAF.

Without JavaScript the hero collapses to a normal 100vh block and everything stays visible; the tall height is gated behind the `.js` class.


### The cursor-driven cover wipe

Moving the pointer across the booklet wipes the penguin cover in from the left, with the soft mask edge sitting **under the cursor** — it is scrubbed, not toggled. Entering eases from rest to wherever the cursor is, then it tracks directly; leaving eases back. On touch, drag across the book to scrub (`touch-action: pan-y` keeps vertical scrolling intact).

The alternate shot was taken at a different distance, so the build script scales it until its book lands exactly on the base book's bounding box, matches exposure (the two shots share a white balance and differ by 10% brightness), and exports **only the book**. Kraft, spine and shadow always come from the base crop, so the two states differ by nothing except the printed cover — verified by diffing the rendered states, which changes nothing outside the cover rectangle.

The overlay is positioned by percentages derived from the same geometry the crops are built with; `build-hero.py` prints them on every run. If you change `BOOK`, `WIDE_W`, `TOP_EXT` or `BOTTOM_EXT`, re-run it and paste the printed percentages into `img.hero__cover` in `index.html`.

The reveal is a `mask-image` gradient whose position is a single registered custom property (`@property --wipe`), written once per frame from a rAF. Measured over 306 pointer moves: **zero forced layout** (the cover's rect is cached and invalidated on scroll/resize) and about 0.3ms of main-thread work per frame.

To swap in a different alternate cover, point `ALT` at the new photograph and set `ALT_BOOK` to its book bounding box.

## Design notes

Type is **Jost** — the closest free match to the Futura-lineage foil lettering on the cover, in the same two weights (300 light / 500 medium) at wide tracking.

Palette is sampled directly from the artwork. **Gold is foil only** — rules and hairlines. Never a button fill, never body text: it does not carry enough contrast on cream to be readable.
