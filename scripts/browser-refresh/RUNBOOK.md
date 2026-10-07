# Inventory refresh through Sam's browser

This is how carswithsam.com gets fresh listings. The dealer site refuses requests from GitHub's servers, so the
nightly GitHub workflow in `scripts/refresh/` cannot run. Instead, an agent session linked to Sam's computer reads
the dealer's public search pages in the Claude app's browser pane and this folder's script turns them into the
site's data files.

Follow the steps in order. A full run is about 15 page reads plus a sticker scan and takes 15 to 30 minutes.

## Rules

- Publish only when `build` and `apply` both pass. If any step fails and the fix below does not clear it, publish
  nothing, leave the live site as it is, and report what failed.
- Never loosen a check in `refresh.mjs` to get a run through.
- Change only the five data files in step 6. Nothing else in the repo is part of a refresh.
- If either site shows a human-verification check or a block page, stop and report. Do not try to get past it.
- Read only the store's own search pages (`lc=18393`) and the manufacturer's window-sticker files. No sign-in is needed
  for either.

## Before you start

- The session must be linked to Sam's computer, with the browser pane tools available (their names end in
  `Claude_Browser__navigate`, `Claude_Browser__javascript_tool`, `Claude_Browser__resize_window`,
  `Claude_Browser__tabs_create`). If they are missing or calls cannot reach the computer, stop and report that the
  computer was not reachable.
- The repo `S81S/sam-ryan-site` must be cloned with push access. Then:

```
git checkout main && git pull --ff-only origin main
export REFRESH_WORK=<a fresh scratch folder outside the repo>
```

## 1. Read the first page of each list

Open a new browser tab, load the first address below, set the tab to 1440 x 900, then load the address again. The
size can only be set once a page is loaded, and it stays set for that tab. The store filter and the result count are
hidden at phone width, and the reader then reports the store as not verified.

Go to each address, and on each one run the full text of `page-reader.js` as the script:

- `https://www.covertchryslerdodgejeepram.com/search/new-chrysler-dodge-jeep-ram/?ct=48&lc=18393&p=1&tp=new`
- `https://www.covertchryslerdodgejeepram.com/search/used/?ct=48&lc=18393&p=1&tp=used`

Each result is a few hundred kilobytes, so the session saves it to a file and replies with a notice (an
"exceeds maximum allowed tokens" error or an "Output too large" note) telling you to read that file. That notice is
the expected outcome here. Do not read those files into the conversation; the next step reads them from disk.

If a result is ever shown in full instead of being saved, stop and report it: the session's limits differ from what
this runbook was tested with.

## 2. Read the remaining pages

```
node scripts/browser-refresh/refresh.mjs ingest
```

It prints what has been captured and the address of every page still missing. Open each missing address, run
`page-reader.js` on it, then run `ingest` again. Repeat until neither list shows a `MISSING pages` line. Read the
pages back to back; the whole capture has to be built within an hour of its first page.

If a result was truncated, or a page shows fewer vehicles than expected, wait a few seconds for the page to finish
loading and read that page again. The newest read of a page replaces the older one.

## 3. Validate and build

```
node scripts/browser-refresh/refresh.mjs build
```

It must print `Capture is valid.` followed by the counts and a list of VINs due for a sticker lookup. If it stops:

| Message | What to do |
| --- | --- |
| Incomplete pagination, Partial page | Read the named page again, `ingest`, `build`. |
| Totals changed during the capture | The dealer updated mid-run. Read every page of that list again. |
| Stale capture | More than an hour passed. Start again from step 1. |
| Wrong or unverified store | The tab is too narrow or the address lost `lc=18393`. Fix it and read that page again. |
| Large inventory drop, Out-of-order capture, record shape differs | Stop. Publish nothing and report. |

## 4. Window stickers (skip when the due list is empty)

1. Open a tab on `https://www.chrysler.com/robots.txt` and run the full text of `sticker-setup.js`.
2. Run `window.__scanBg([...])` with the VIN list that `build` printed.
3. Run `sticker-poll.js` repeatedly until it reports `done: true`. Each lookup takes one to two seconds.
4. Run `sticker-dump.js`. With more than 25 results, run it once per slice of 25 (`slice(0, 25)`, `slice(25, 50)`, ...).
5. `node scripts/browser-refresh/refresh.mjs ingest` and confirm the sticker result count matches.

A scan that stops early because the sticker site refused a request is fine. Carry on with what was read; the rest
are picked up on a later run.

## 5. Write the data files

```
node scripts/browser-refresh/refresh.mjs apply
```

It merges the sticker results, re-checks that no already-verified sticker record changed, writes the five data
files, and prints a suggested commit message.

## 6. Publish

```
git add data/used-inventory.json data/used-inventory.js data/equipment-index.json data/equipment-index.js data/vehicle-photos.json
git commit -m "<the suggested message>"
git push origin main
```

Publish even when no vehicles changed: the files carry the time of the check, which the site shows shoppers as
"Listings checked".

## 7. Confirm

- The push starts the "Build searchable vehicle pages" workflow, which regenerates the vehicle pages and commits
  them. Check that it finished: `gh run list --limit 2`.
- In the browser, on any carswithsam.com page, run
  `(await (await fetch('/data/used-inventory.json', {cache: 'reload'})).json()).capturedAt` and confirm it is the new
  capture time. Cloudflare usually publishes within a minute or two.

## 8. Report

Say how many vehicles are listed (new and used), how many were added and removed, how many prices changed, how many
stickers were newly verified, and anything that was skipped or failed. If nothing was published, say so first.
