# The add-on menu — design

A paper menu that turns. One sheet per journey: the journey's name at the head,
then the things you can add to it with prices beside them.

## Where it sits

A new section between Journeys and "In their words". Journeys sets the three
shapes of trip; the menu is what you hang on one. Putting it anywhere else
breaks that sentence.

This makes five numbered sections, so the indices renumber: Experiences 01/05,
How it works 02/05, Journeys 03/05, the menu 04/05, Enquire 05/05.

## What it is made of

The site already has the vocabulary. A price is a coordinate in a different
unit: the plate captions are name-left, monospace-metadata-right, separated by
hairlines, and an a la carte row is the same shape. Nothing new is invented.

- The sheet is bounded by a hairline and carries crop marks at two diagonal
  corners, exactly as the image slots do. The brand is a printed object; a menu
  is the most literal case of that on the whole site.
- Add-on rows: name and a one-line note on the left, price right in the
  monospace voice with `tabular-nums`, so figures align down the column the way
  the coordinates already do.
- Rows are separated by hairlines, not boxed. Reference: Alison Roman's printed
  catalogue rhythm — "thin borders and flat surfaces rather than glossy cards".

Register comes from Essie Wine: bookplate restraint, parchment and old gold,
ghost links, sharp corners, no ornament. It is close enough to the existing
palette that no new token is needed.

## How it turns

A pager, not a page-curl. A 3D curl would be kitsch and Kobu — the reference
this site is built from — says plainly: do not introduce decorative elements
that distract. And not plain tabs either, which read as a web widget rather
than paper.

So: prev/next, plus a named index of the three journeys so it is never a blind
pager, plus a monospace `01 / 03` counter at the head of the sheet. The outgoing
sheet slides a few pixels and fades, the incoming one arrives from the side it
was asked for. Direction-aware, transform and opacity only, in keeping with the
rest of the page. Roughly 320ms.

## It must work without JavaScript

The site holds this line already — the hero collapses to a normal block and
everything stays visible with JS off — so the menu cannot be a JS-rendered
widget.

Therefore **all three sheets are real markup**. The static page is a list of
anchor links and three `<article>` sheets with ids. With JS off, the links jump
to sheets stacked down the page and every price is readable. With JS on, the
script upgrades the index to a proper `tablist`/`tab`/`tabpanel`, hides the
inactive sheets, animates between them, and keeps the hash in sync so a page is
linkable.

ARIA roles are applied by the script, never in the static markup: a `role="tab"`
that does not behave like a tab is worse than no role at all.

Keyboard follows the standard tab pattern — left/right arrows, Home, End — which
comes free with the roles. Touch gets a horizontal swipe, with `touch-action`
set so vertical scrolling is unaffected, the same way the hero's cover wipe does
it.

## Content

Three pages, from the journeys already on the site: The city and the coast
(four days), Wider and slower (seven days), The whole thing (ten days or more).

Add-ons are drafted as plausible Cape Town options and **every price ships as
`R 0 000`** — an obvious placeholder that cannot be mistaken for a real figure
if it goes unreviewed. Prices are set per person unless a row says otherwise;
the unit is stated on the sheet rather than repeated on every line.

## The positioning conflict, recorded

The site was built enquiry-led on purpose: "no date pickers, no price tables",
and Journeys still tells people to treat the options as "a sense of pace, not a
package". A priced menu contradicts that line.

The decision is to publish prices. The Journeys copy is left alone for now, so
the contradiction stands and is deliberate. Revisit that line before launch.

## Not doing

- No totals, no cart, no quantity steppers. The page is still enquiry-led; the
  menu informs the conversation, it does not transact.
- No currency switcher.
- No new nav entry. The nav fades out with the hero and already carries four
  items; a fifth crowds it for no gain.
