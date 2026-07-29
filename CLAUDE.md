# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A client-side wall art planning tool for a framing/print business (Brilliant Prints). Users lay out picture frames on a virtual wall, drag them around with collision/spacing enforcement, get sizing suggestions, and calculate prices. It is plain HTML/CSS/vanilla JavaScript (ES modules) with **no framework, no package.json, no build step, no linter, and no test suite**.

`AUDIT.md` records a full three-perspective audit (UX, code, marketing) with what was fixed and what remains deferred (notably: the order flow is intentionally unwired — see AUDIT.md §5).

## Running the App

Because the JS uses ES modules (`type="module"`), pages must be served over HTTP — opening `index.html` via `file://` will fail. Use any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

There are no build, lint, or test commands. Verification is manual, in the browser. Console policy: `console.log` is not used (it was purged); `console.error`/`console.warn` mark genuine problems.

### Pages

- `index.html` — the main planner (wall canvas, frame sets, suggestions, pricing). Loads only `js/main.js`, which imports everything else.
- `frame-calculator.html` / `print-calculator.html` — standalone calculators with their own inline `<script>` logic (they do not use `js/` modules). They hand results to the planner via the `newFrameData` localStorage key.
- `order-form.html` — standalone page that reads an `orderSummary` localStorage key. **Currently unreachable by design**: nothing links to it and nothing writes `orderSummary` (documented gap, AUDIT.md §5).

## Architecture

Entry point is `js/main.js` (DOMContentLoaded handler). It feature-detects DOM elements so the same script can load on non-planner pages, then instantiates `WallArtPlanner` (exposed as `window.planner`), `SuggestionEngine` (`window.suggestionEngine`), and `PriceCalculator`, and wires page-level UI (screenshot via html2canvas CDN with a brand watermark, modals with Escape/keyboard support, calculator pre-fill).

Object hierarchy, all in `js/`:

- **`WallArtPlanner.js`** — central controller. Owns wall dimensions, the wall display unit, the list of `Collection`s, frame spacing, the live rendering scale, the boundary marquee, background image upload/removal, and state persistence.
- **`Collection.js`** — a group of identically-sized frames (one "Add Frames" submission). Creates/restores `Frame`s (setting `frame.collection` back-references), positions new frames to avoid collisions, renders the legend entry.
- **`Frame.js`** — a single frame. Computes total size (`print + 2×mat + 2×frame`), builds its DOM from an inline template string, dispatches `frameMove` events, owns the per-frame photo upload/cropper modal.
- **`FrameDragManager.js`** — per-frame drag logic (mouse + touch): grid snapping, wall-bounds clamping, minimum-spacing collision checks, pushing/reverting on blocked moves. Has a `destroy()` that must be called when a frame is removed (DeletionManager does this).
- **`DeletionManager.js`** — the single owner of frame/collection/delete-all removal. All deletion flows route here (the delete button dispatches `frameDelete` with `{frameId, collectionId}` in `detail`, handled by `WallArtPlanner`).
- **`SuggestionEngine.js`** — suggests a complementary frame size matched to the current layout bounds.
- **`PriceCalculator.js`** — pure pricing logic. Contains the business's pricing formulas (area/linear-meter based with several sequential markups keyed to frame type 20/30/40mm). Treat the magic numbers here as business rules — don't "clean them up" without instruction.
- **`utils.js`** — `SCALE` (the *default* 10 px per inch — see below), unit converters, `DEFAULT_WALL`.

### The rendering scale (important)

`utils.js`'s `SCALE = 10` px/inch is only a **fallback**. The live source of truth is **`planner.scale`**, recomputed by `WallArtPlanner.updateWallDisplay()` as `canvasPixelWidth / wall.width` every time the canvas is fitted to its container/viewport (including on window resize/orientation change, which trigger a re-render of all frames via `rerenderFrames()` → `frame.applyScale()`). Frame sizes, layer insets, positions, spacing indicators, the boundary marquee, and drag math all use `planner.scale`. Any new pixel↔inch conversion must use it too, or geometry will desync when the canvas is clamped.

### Performance conventions

- `frameMove` fires per pointer event during drags. Saves triggered from it use `planner.saveStateDebounced()`; marquee updates go through `planner.scheduleMarqueeUpdate()` (coalesced per animation frame). Don't add per-move synchronous work.
- `saveState()` handles `QuotaExceededError` by retrying without image data and showing a visible `.storage-warning` banner; restore failures back the raw state up to `wallArtPlannerState_backup` instead of deleting it.

## Critical Conventions

### Units — the #1 source of bugs

Internal canonical unit is **inches**, but the UI mixes units, and conversions happen at specific boundaries:

- Print width/height: inches everywhere.
- **Mat width: the UI input (`#mattWidth`, labeled "Mat Width") and `newCollection.mattWidth` are in CM.** `Collection` and `Frame` convert to inches internally (`Frame` keeps both `mattWidthCm` and `mattWidth` in inches). Data passed into a `Frame` constructor must have `mattWidth` in CM. Internal identifiers use the legacy `matt` spelling; UI copy says "Mat".
- **Frame width: the UI select (`#frameWidth`) uses MM string values ("20"/"30"/"40")**, converted to inches (`mmToInches`) before being stored on `newCollection`/`Collection`/`Frame`.
- **Wall dimensions: stored in inches always.** `planner.wallUnit` (`'in'`/`'cm'`, persisted) only changes how the `#wallWidth`/`#wallHeight` inputs and displays are presented — conversion happens in `toDisplayUnit`/`fromDisplayUnit`/`syncWallInputs`.
- Rendering: `planner.scale` px per inch (see above).
- Pricing: `PriceCalculator` converts inches → cm before applying formulas.
- The print calculator's `dimensions.totalWidth/totalHeight` are always inches (its input handler converts metric on the way in) — do not re-convert them.

### localStorage keys (cross-page data flow)

- `wallArtPlannerState` — full planner state (wall + wallUnit, collections/frames **including ids and count**, gridSize, frameSpacing, background image data URL). Collection/frame ids are persisted and `nextId` counters restored on load — keep `serialize()` and the constructors in sync.
- `wallArtPlannerState_backup` — written only when restoring `wallArtPlannerState` throws; never read automatically.
- `newFrameData` — one-shot handoff from the calculators to the planner's "Add Frames" form (`printWidth`/`printHeight` in inches, `matWidth` in CM, `frameWidth` in inches). `main.js` consumes and removes it on load.
- `orderSummary` — read by `order-form.html`; currently nothing writes it (see AUDIT.md §5).
- Image URLs restored from storage are validated to be `data:image/` before use — keep that guard.

### Design system

All colors/fonts/spacing come from the `:root` design tokens at the top of `styles.css` (WCAG AA contrast-checked). Re-skin by changing tokens, not by introducing new hex values. Buttons share one `.btn-*` base; the beta banner is the shared `.site-banner` class (do not reintroduce inline banner styles).

### Other patterns

- Classes take a `planner` reference as a constructor argument to query live data (`planner.getAllFrameObjects()`, `planner.frameSpacing`, `planner.scale`); preserve this wiring when creating `Collection`/`Frame` objects. The planner (not the DOM selects) is the source of truth for spacing and scale.
- Frames dispatch `frameMove` (position changes) and `frameDelete` (with `{frameId, collectionId}` detail) custom events; `wallDimensionsChanged` is dispatched on the wall canvas.
- DOM lookups are defensive (`if (element)`) so `main.js` can run on pages missing planner elements — follow suit for any new element wiring.
- Accessibility patterns to preserve: labels use `for=`, modals are `role="dialog"` with button closes and Escape handling, collapsible section headers are keyboard-operable with `aria-expanded`, icon buttons carry `aria-label`s, `:focus-visible` styles come from the token `--focus-ring`.

### `functions.php`

A WordPress child-theme (Hello Elementor / WooCommerce) `functions.php` for the production site that hosts this tool. It references `lib/` and `assets/` files that are **not in this repo** and shares no code with the planner. Edit only if the task is explicitly about the WordPress/WooCommerce side.
