# Perfect Car implementation handoff — 2026-10-11

## Preserve

- Approved dark navy/gold stacked feature cards and serif typography.
- Phone number graphics and font. Compare's Shared / Different layout.
- Original saved question/choice IDs, exclusions, model filters and VIN evidence.
- Existing inventory refresh, vehicle-page and sitemap work.

## Current repair — Wrangler inventory flow and engine output

- Reproduced the original failure: duplicate engine/bundle cards led the 2.0L route to a manual-transmission card and zero matches. The earlier positive-flow tests did not cover this ordinary sequence.
- The 2026 four-door Wrangler now has separate canonical physical engine and transmission choices, retaining all old IDs for saved links. VIN checks account for all 45 current verified Wranglers: 24 turbo I4, 21 V6; all 45 automatic. The guide offers the stock-backed alternatives and skips the already-installed automatic without adding a fabricated preference.
- Inventory-aware routing is currently scoped ONLY to 2026 Wrangler four-door. A broader rollout hid previously approved options on other models; those models retain prior routing until individually audited. Factory catalog data is retained even when a configuration has no verified current inventory support.
- Added three actual OEM engine images; owner-manual images of both shifters; five exact OEM wheel designs; and five OEM reference illustrations for remote start, the 115 V outlet, auxiliary switches, sway disconnect and Off-Road Plus. Reference illustrations are labeled, not represented as vehicle photographs. Wheel recognition uses the installed specification and rejects ambiguous optional Sahara wheel descriptions. There is no two-card limit; the current wheel stack exposes five proven designs.
- Added source-backed power output to 90 of 91 active engine-card entries (not 90 distinct engines). Exact model/year/calibration, hybrid total output, PowerShot, older trim/transmission/fuel ranges and development targets stay explicit. See ENGINE-OUTPUT-AUDIT.md for source links and remaining gaps. This is not complete powertrain coverage of every model/year represented by the site.
- The approved card stack, phone graphics/font, Compare layout and concurrent running-board/search-synonym change are preserved.
- Latest validation: 106 guide/gesture/group/routing checks plus 25 output/evidence checks passed. These include a sequential turbo route, all five wheel alternatives, all-engines-excluded recovery and saved legacy bundles. They are Node/VM checks, not physical-device or browser interaction proof.
- Browser/device QA remains unavailable under the current Sites workflow. Do not claim the live swipe problem is fully verified on Galaxy phones or desktop.

## Previous technology-photo correction

- Added five original OEM photos across six exact factory choices: Wrangler 12.3-inch NAV; Pacifica 10.1-inch NAV, FamCAM, Harman Kardon and both theater-package cards. Display crops center the feature; package captions explicitly identify the one feature pictured. Base-radio cards do not borrow navigation images.
- Wrangler and Pacifica base/NAV radios now resolve from the active complete VIN radio specification, including same-size replacements. Source, model, year, size and navigation guards remain mandatory.
- Pacifica Limited AEZ now links six exact included features (FamCAM, 115 V outlet, Stow ’n Vac, hands-free sliding doors, Harman Kardon and power passenger seat). Chosen package content is summarized instead of asking redundant questions; it does not fabricate saved preferences or VIN installation evidence.
- FamCAM is a primary technology decision. The known Select source conflict now remains unknown in Perfect Car, as in Compare, rather than incorrectly marking Select unavailable. Both sources are linked; explicit VIN evidence can still settle the match. Do not infer Select FamCAM from Group II alone.

## Previous published correction

- Canonical 2026 Ram 1500 / 3500 UBE 8.4-inch and UBQ 12-inch choices now use the installed Uconnect version, navigation and active screen evidence. Optional replacements override the base screen. Incomplete or conditional evidence cannot confirm an installation.
- Exact 2026 Grand Cherokee Hurricane 4 and Ram 3500 HO Cummins bundles resolve against both installed engine and transmission lines. Ram's OEM towing sheet documents its ZF / TorqueFlite HD naming.
- Display one card per reviewed Ram screen size. Historic full-radio choices retain their own predicates; a saved choice replaces its duplicate in the visible deck. If both predicates were saved, retain both for review.
- Reviewed Big Horn/Lone Star H1 includes the heated wheel; H2 includes the heated wheel, 12-inch radio and Alpine audio, with independently checked H1 prerequisite for Alpine. This is a factory guide dependency, not VIN installation proof.
- Compare -> details -> Compare preserves exact modelScope. Original-sticker notes use the actual source URL, including fallback sources.
- Body-color Wrangler three-piece hardtop uses Jeep's correctly labeled OEM illustration. Do not use the Premium Sunrider image for the base soft-top material or invent a dual-top photograph.

## Verification and limits

- The previous release passed 185 local checks but still failed the user’s normal Wrangler sequence. The current sequence checks above supersede that release gate; a passing count alone is not proof of the live experience.

- Complete positive-choice guide journeys cover Wrangler, Ram 1500, Ram 3500, Grand Cherokee and Pacifica; they continue through remaining applicable categories and retain the vehicle pictured for the selected features.
- VM interaction tests cover swipes/buttons, back/undo, saved choices, duplicate screen display, package routing, Compare handoff, search synonyms and original-sticker links.
- This environment lacks the supported browser QA capability. No claim of visual testing on physical Galaxy phones, folded/unfolded screens or desktop is warranted.
- R12500's correct VIN is 3C63RRGL5TG354434. On this pass, the original Chrysler URL returned HTTP 200 and a valid 59,622-byte PDF. Extracted text confirms the VIN, Ram 3500 Tradesman, 6.7L HO Cummins and Uconnect 5 NAV 12-inch screen. This verifies upstream document availability, not physical-device click behavior.
- Inspected the 2026 Pacifica fleet chart PDF pages 4–5 directly. Select's FamCAM cells/package prose conflict. The existing retail-brochure review also identifies that conflict; the retail PDF could not be re-downloaded on this pass (HTTP 403). No new Select inclusion claim was made.

## Remaining work, in order

1. Verify the live interaction and layout on phone, folded/unfolded and desktop widths when supported browser/device QA is available.
2. Complete the engine gaps in ENGINE-OUTPUT-AUDIT.md and extend inventory routing to other models only after reproducing their normal journeys.
3. Replace remaining generic illustrations with accurately matched OEM/dealer feature images. Highest gaps: Wrangler soft/dual roofs and base 12.3-inch radio; Pacifica base 10.1-inch radio; Ram HD 8.4-inch radio; exact seat materials and remaining audio brands. Navigation screens are now photo-backed. The earlier audit counted 41 photo-backed cards among 676 choices before consolidation and this photo batch; coverage is still incomplete.
4. Expand sourced trim/package dependency coverage. Keep conditional equipment and replacement options visible until their requirements are established. Do not treat "requires" as "includes."
5. Review exterior-mirror assemblies and other repeated factory descriptions for safe grouping; towing/GT4 alternatives must not disappear after selecting a base package.
6. Expand full positive-combination journeys beyond the five reviewed models. Improve explanations for why each selection changes available matches.
7. Include the R12500 sticker button in the eventual live device interaction review; upstream PDF retrieval is now verified.

All helper agents stopped at their usage limit during this pass. Their completed edits and findings were recovered; they are not running in the background.
