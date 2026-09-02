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

Both are generated from the client's cover artwork:

- `booklet-wide.jpg` — 2600×1122, desktop. Kraft extended left/right so it bleeds full-width at any viewport.
- `booklet-tight.jpg` — 1199×1236, mobile (≤700px). Extra kraft above the book so the nav has clean space to sit on.

The photograph carries the wordmark, so there is deliberately no headline typed over it.

## Design notes

Type is **Jost** — the closest free match to the Futura-lineage foil lettering on the cover, in the same two weights (300 light / 500 medium) at wide tracking.

Palette is sampled directly from the artwork. **Gold is foil only** — rules and hairlines. Never a button fill, never body text: it does not carry enough contrast on cream to be readable.
