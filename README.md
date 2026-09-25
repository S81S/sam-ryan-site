# Unattended inventory refresh

This replaces the dependency described in the top-level `README.txt`:

> The refresh task is scheduled every four hours in the local Codex app. It
> requires the computer/app and required sessions to remain available.

Instead, `.github/workflows/refresh-inventory.yml` runs this pipeline on
GitHub's own servers every 4 hours (plus on-demand via "Run workflow" in the
Actions tab, and automatically whenever these scripts change). It commits any
changed `data/*.json` / `data/*.js` files back to the repo, which Cloudflare
Pages then redeploys automatically. No local machine has to stay on.

## What's here

- **`fetchInventory.mjs`** — crawls Covert CDJR Austin's public search pages
  for store 18393 only (`ct=48&lc=18393&tp=new|used[&p=N]`) and turns each
  listing card into the row shape `inventory-engine.mjs`'s `normalize()`
  expects.
- **`fetchStickers.mjs`** — for a VIN, builds
  `https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=<VIN>`
  (the only accepted host in `inventory-engine.mjs`'s own `stickerLink()`
  validator — Jeep/Ram/Dodge stickers all live under `chrysler.com`, not
  brand-specific domains), fetches the PDF, and runs the text through **the
  site's own** `analyzeSticker()` from `equipment-search.mjs` — the same
  equipment-matching logic `find-my-car.html` / `compare.html` already
  trust.
- **`refresh.mjs`** — the orchestrator: crawls, validates every record
  through `normalize()`, merges into the existing `data/used-inventory.json`
  (preserving `firstSeenAt`, tracking price/mileage/status changes, and only
  marking a vehicle `not-observed` when a pass cleanly covered the whole
  store with no rejected/unparsed records), then refreshes window stickers
  for any VIN that's new, unverified, or whose sticker data is older than 14
  days (3 days if previously `unavailable` — a sticker often just hasn't
  been published by Stellantis yet).

## ✅ Calibrated against the live site (2026-09-22)

Earlier drafts of `fetchInventory.mjs` were written from the already-known
field list in `data/used-inventory.json`, since this sandbox itself can't
reach `covertchryslerdodgejeepram.com` or `chrysler.com`. That's since been
fixed properly: using a browser linked to your computer, the exact regex
logic in this folder was run against the **live** search pages and window
sticker endpoint, field by field, and corrected until it matched reality.
What that calibration found and fixed:

1. **Attribute whitespace quirks.** The site's templating emits stray
   double-spaces and a space before `>`, e.g.
   `<span  class="everest-stock-span" >Stock#: X`. A naive `class="foo">`
   match silently fails on this — every selector now tolerates `\s*` around
   `>`.
2. **Field ordering.** Each card's title/photo actually sit *before* its
   Stock#/VIN line in the HTML, not after — `fetchInventory.mjs` now reads
   title and photo from the HTML preceding the Stock# match, and
   price/mileage/status/CARFAX from the HTML following it.
3. **Doc Fee and CARFAX are not near the card.** They're rendered somewhere
   else on the page entirely (hundreds of thousands of characters away) —
   `normalize()` treats both as optional, so the script just leaves them
   null rather than chase that.
4. **Inline SVG icons are huge** (~1,800 characters) between a pill's class
   attribute and its text — the search window for status/mileage had to be
   widened well past a "should be enough" guess.
5. **Availability status values**: live values seen on the page are `In
   Stock` / `In Transit` / `Allocated` / `Pooled` / `On Order` (from the
   site's own filter config) — only `In Stock` maps to `normalize()`'s
   `'listed'`.
6. **Sticker fetch**: confirmed live — a real Monroney PDF for a Stellantis
   VIN is genuinely served at `www.chrysler.com/hostd/windowsticker/...`
   (~80KB, `%PDF` magic bytes). A VIN with no sticker on file still returns
   HTTP 200, but with a tiny ~1.1KB "Error PDF" rather than a 404 —
   `fetchStickers.mjs` now short-circuits on file size (<10KB) rather than
   attempting text extraction on it.

**Verification, not just code review**: the corrected `fetchInventory.mjs`
logic was run against a full live page (used inventory, page 1) — 48/48
cards parsed with zero rejects — and 6 of those real captured records were
then run through the actual `normalize()` function from
`inventory-engine.mjs` in this repo: all 6 passed with correct price,
mileage, and status. Pagination (`&p=2`) and the new-vehicle segment were
separately spot-checked live as well (48/48 parsed, 0 rejects each).

## Before the first scheduled run

The one thing that couldn't be verified from here: running the *whole*
pipeline (`node scripts/refresh/refresh.mjs`) end-to-end in one process,
since that needs `unpdf` installed via `npm install`, which this sandbox's
own network policy also blocks (npm registry access wasn't reachable here
either). Do this once, from your own machine or by watching the first GitHub
Actions run in the Actions tab:

```bash
npm install
node scripts/refresh/refresh.mjs
git diff data/used-inventory.json
```

A healthy first run should look like "prices/mileage nudged, a handful of
vehicles added/removed" — not "every vehicle disappeared." If `refresh.mjs`
logs any rejected records, they're written to
`scripts/refresh/last-run-rejects.json` (also uploaded as a workflow
artifact on every scheduled run) so you can see exactly what didn't parse
and why.

## Notes / known gaps

- **Sticker fetch volume**: the very first run will try to check window
  stickers for every VIN in inventory (~700), which is a lot of PDF fetches
  in one go. Pass `--sticker-limit=100` to `refresh.mjs` (or edit the
  workflow step) to ramp up gradually if the manufacturer endpoint starts
  rate-limiting.
- **No secrets needed**: the workflow only needs the default
  `GITHUB_TOKEN` (already provided by Actions) to push the data-file commit.
- **Concurrency guard**: the workflow uses a concurrency group so two
  refresh runs never overlap and race on writing `data/*.json`.
