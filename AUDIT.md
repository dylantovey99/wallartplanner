# Wall Art Planner — Comprehensive Audit

Audited from three perspectives: a **photographer** (the end user planning a gallery wall), a **senior developer** (code quality, correctness, performance), and an **experienced marketer** (brand, conversion, trust). Findings are ranked by severity; items marked **[FIXED]** were remediated in the accompanying overhaul, items marked **[DEFERRED]** are documented recommendations for future work.

---

## 1. Critical correctness bugs (developer)

| # | Finding | Status |
|---|---------|--------|
| 1.1 | **Deleting a frame doesn't persist.** `Frame.js` dispatched `frameDelete` with no `detail`; the planner's handler required `event.detail` and always returned early, so `saveState()` never ran. Deleted frames reappeared on reload. The entire `DeletionManager.deleteFrame()` path was unreachable from the delete button. | [FIXED] |
| 1.2 | **Opening the planner in two tabs wiped the saved layout.** `validateSavedState()` filtered saved frames by IDs that `Collection.serialize()` never wrote, so every cross-tab `storage` event matched nothing, dropped all collections, and persisted the emptied state. | [FIXED] |
| 1.3 | **`saveState()` ran on every mousemove** during a drag — a full JSON serialization including base64 thumbnails and the wall background data URL, at pointer-event frequency. | [FIXED] — saves on drag end + debounced elsewhere |
| 1.4 | **Any error during state restore deleted the user's entire saved layout** (`localStorage.removeItem` in a catch spanning the whole restore loop). | [FIXED] — state is backed up, never destroyed |
| 1.5 | **localStorage quota exhaustion was silent.** One wall photo + a few frame thumbnails exceeds the ~5MB quota; saves failed with only a console.error, and the user lost work without warning. | [FIXED] — visible warning + retry without images |
| 1.6 | **Metric mode in the print calculator returned ~10× wrong sizes** (input normalized to inches, then divided by 2.54 again). For an Australian customer base, metric is the primary path — this fed garbage frames into the planner and quotes. | [FIXED] |
| 1.7 | **The frame calculator's unit toggle silently reinterpreted values** (8×10 inches became 8×10 cm) — the opposite semantics of the print calculator's toggle. | [FIXED] — values now convert |
| 1.8 | **`ReferenceError` in `main.js`** (`wallCanvasElement` undefined) whenever the html2canvas CDN failed, breaking the fallback warning for the only sharing feature. | [FIXED] |
| 1.9 | **Frames wider than the wall produced `NaN` positions** (`maxCols = 0` → `i % 0`), creating ghost frames invisible to layout logic but present in the DOM and saved state. | [FIXED] |
| 1.10 | **Frame IDs were never serialized**, so "Frame 7" in a price quote meant a different frame after reload; ID types (Number vs String) were compared inconsistently across four files. | [FIXED] — IDs persist, `nextId` restored |
| 1.11 | Duplicate `#frameSpacing` change handler (registered in both `WallArtPlanner` and `main.js`) — every change did the work and the localStorage write twice. Three classes also re-read the spacing `<select>` from the DOM instead of using `planner.frameSpacing`. | [FIXED] |

## 2. Responsiveness (the "fully responsive" mandate)

| # | Finding | Status |
|---|---------|--------|
| 2.1 | **Frames rendered at a fixed 10px/inch while the canvas was clamped to its container.** On a 375px phone, frames rendered ~3.4× too large relative to the wall; even at desktop defaults (120" wall in a ~1110px slot) there was a silent ~7.5% geometry error, and drag no longer tracked the cursor. For a tool whose value proposition is "will this fit on my wall," this was a correctness bug, not cosmetics. | [FIXED] — dynamic px-per-inch scale derived from canvas width, recomputed on resize/orientation change |
| 2.2 | **Exactly one media query existed in the whole codebase** (max-width: 768px); no tablet handling, no resize listener anywhere, calculator/order pages had zero responsive rules. | [FIXED] |
| 2.3 | **Tap targets shrank to 20×20px on mobile** (below the 44px minimum), the drag affordance was hover-only (invisible on touch), and mobile input font-size (14.4px) triggered iOS auto-zoom on every focus. | [FIXED] |
| 2.4 | The calculator pages used the planner's fixed 420px sidebar class inside a 1600px container (~1150px dead whitespace, 600px preview clipped by `overflow:hidden`); the purpose-built `.calculator-container` class existed but was never used. | [FIXED] |

## 3. Design & brand (marketer)

| # | Finding | Status |
|---|---------|--------|
| 3.1 | **No `font-family` declared anywhere** — the entire product rendered in Times New Roman. | [FIXED] — system font stack |
| 3.2 | **No design system**: two competing blue palettes (Bootstrap #007bff vs Material #2196F3), three different reds for destructive states, ~10 ad-hoc greys, no CSS variables, buttons from three unrelated systems (`.btn-danger` inherited none of the base button styling). | [FIXED] — `:root` tokens, unified `.btn` system |
| 3.3 | **Zero branding**: no logo slot, no `<h1>` on any page, generic `<title>`, no footer, no contact route anywhere in the product. | [FIXED] — titles, h1s, footer with contact placeholder |
| 3.4 | **The beta banner actively undermined trust** — "please cross-verify any results with BPro staff" (internal codename, no way to contact those staff), duplicated as a 130-char inline style on four pages, styled like a browser error bar. | [FIXED] — shared class, reassuring copy |
| 3.5 | Prices displayed as bare `$X.XX` — no currency, no GST context, no estimate framing. Price line items used internal counters ("Collection 1 / Frame 7"). | [FIXED] — AUD estimate note |
| 3.6 | The screenshot export (the only sharing mechanism) carried no branding. | [FIXED] — watermark line on export |
| 3.7 | WCAG AA contrast failures on every primary button (3.99:1), delete buttons (3.41:1), photo-upload buttons (2.78:1), active nav links, and spacing indicators. | [FIXED] — token palette is AA-checked |
| 3.8 | **No email capture / lead retention** — a user can spend 30 minutes designing and leave no trace. | [DEFERRED] |
| 3.9 | **No shareable layout URL** — sharing is a PNG download only. | [DEFERRED] |

## 4. Missing functionality (photographer)

| # | Finding | Status |
|---|---------|--------|
| 4.1 | **Wall dimensions were inches-only** — for an Australian business whose customers measure in cm. Both calculators had unit toggles; the planner itself didn't. | [FIXED] — cm/inches toggle |
| 4.2 | No preset print sizes (8×10, 11×14, 16×20, 20×24, A4–A1) — every frame required typing two numbers; and no portrait/landscape swap when adding frames. | [FIXED] — presets + swap button |
| 4.3 | **Uploading a background photo locked the wall dimensions with no escape** — the only unlock was "Delete All Frames," destroying the whole layout. | [FIXED] — remove-background button |
| 4.4 | **The per-frame photo upload (📷) — a genuinely strong feature — was completely undiscoverable**; no help text mentioned it, and the stale HTML template didn't show it. | [FIXED] — surfaced in help text |
| 4.5 | Every uploaded wall photo is assumed to be exactly 2.4m tall; any other wall silently produces a wrong-scaled preview. Needs a "mark a known dimension" calibration step. | [DEFERRED] |
| 4.6 | No undo/redo; single-frame delete had no confirmation and no recovery. | [DEFERRED] |
| 4.7 | No duplicate-frame, no align/distribute tools, no centreline or 57–60" eye-level guide — the core operations of gallery-wall hanging. | [DEFERRED] |
| 4.8 | Single saved layout only — no named layouts, no A/B comparison. | [DEFERRED] |
| 4.9 | Frame material (Black/White/Oak/Walnut) renders visually but is ignored by pricing — all four cost the same. Confirm whether this is a real business rule. | [DEFERRED — needs business input] |

## 5. The order flow (documented per owner's decision — left as-is)

The pricing modal is a dead end and the order flow does not function:

- **Nothing links to `order-form.html`** — it is absent from every nav; the only way to reach it is typing the URL.
- **Nothing ever writes the `orderSummary` localStorage key** that the page reads, so it renders an empty order box.
- The submit builds a `mailto:sales@bpro.com.au` URL (verify this inbox — it is not the brilliantprints.com.au domain) and then redirects to the planner after 1 second **whether or not a mail client opened**, with no confirmation. `mailto:` bodies are also length-capped, truncating large orders.
- Consequence: the complete customer journey is *design a wall → see a price → close the modal*. The tool generates a quote and abandons the customer.

**Recommended fix when ready:** a "Request This Quote" button in the price modal that writes `orderSummary` and links to an improved order form (with on-page confirmation and copy-to-clipboard fallback), or direct WooCommerce integration on the production site.

## 6. Code health (developer — remediated in cleanup phase)

- **Dead files removed**: `js/StateManager.js`, `js/WallDimensionsManager.js` (orphans, would have thrown ReferenceErrors if ever wired), `js/BoundaryTester.js` + `boundary-test.html` (disabled debug harness that shared — and could corrupt — live customer localStorage state, with instructions referencing a button that didn't exist).
- **Dead code removed**: the out-of-sync `<template id="frameTemplate">` in index.html (never referenced; missing the photo button), `Frame.validateDimensions()` (48 lines validating an expression against itself), 160 lines of debug-only overlay rendering in Frame.js, the never-read `frameDetails` Map (a strong-reference memory leak on deletion), never-populated `.distance-indicators` DOM nodes, redundant per-module `<script>` tags, unused CSS (`.move-icon`, `.add-to-planner`, `.calculator-container` duplicates, dead canvas-height rules).
- **Console noise**: ~139 `console.*` calls (~16+ per mousemove during drags, several serializing full state objects via `JSON.parse(JSON.stringify(...))` purely for logging). All `console.log` removed; `error`/`warn` retained.
- **Listener leaks fixed**: drag `mousedown`/`touchstart` handlers were bound inline and unremovable; `FrameDragManager` now has a `destroy()` called on frame removal.
- **Duplication consolidated**: total-size (`print + 2×mat + 2×frame`) computed in six places (one divergent — `PriceCalculator` uses its own hardcoded frame depth, retained as a business rule); three bounding-box implementations; two incompatible overlap checks; inline unit conversions across nine files despite `utils.js` converters.
- **Security hardening**: `data:image/` prefix validation on image URLs restored from localStorage before injecting into `style.backgroundImage`/`img.src`; quoted `url("...")` interpolation.

## 7. Remaining recommendations (priority order)

1. **Connect the order flow** (§5) — highest commercial value; three already-built pieces need one link.
2. **Undo + duplicate frame + align/distribute + eye-level guide** (§4.6–4.7) — the biggest usability gains for the core audience.
3. **Background photo calibration** (§4.5) — prevents confidently wrong size decisions.
4. **Email capture / shareable layouts** (§3.8–3.9) — lead retention.
5. **Named layouts** (§4.8).
6. **Resolve the frame-material pricing question** (§4.9) with the business.
7. Longer-term: a build step (even a minimal bundler) would enable minification, dead-code elimination, and a test harness; the pricing formulas in `PriceCalculator.js` are the first candidate for unit tests.
