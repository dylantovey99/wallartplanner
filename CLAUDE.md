# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A client-side wall art planning tool for a framing/print business ("BPro" / Brilliant Prints). Users lay out picture frames on a virtual wall, drag them around with collision/spacing enforcement, get sizing suggestions, and calculate prices. It is plain HTML/CSS/vanilla JavaScript (ES modules) with **no framework, no package.json, no build step, no linter, and no test suite**.

## Running the App

Because the JS uses ES modules (`type="module"`), pages must be served over HTTP — opening `index.html` via `file://` will fail. Use any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

There are no build, lint, or test commands. Verification is manual, in the browser (the code logs extensively to the console — use it).

### Pages

- `index.html` — the main planner (wall canvas, collections, suggestions, pricing). Loads all `js/` modules.
- `frame-calculator.html` / `print-calculator.html` — standalone calculators with their own inline `<script>` logic (they do not use `js/` modules). They hand results to the planner via the `newFrameData` localStorage key.
- `order-form.html` — standalone page that reads an `orderSummary` localStorage key.
- `boundary-test.html` — test harness for the planner's boundary/drag logic; loads the same `js/main.js` and counts as a "planner page" in `main.js`'s page detection.

## Architecture

Entry point is `js/main.js` (DOMContentLoaded handler). It feature-detects DOM elements so the same script can load on non-planner pages, then instantiates `WallArtPlanner` (exposed as `window.planner`), `SuggestionEngine` (`window.suggestionEngine`), and `PriceCalculator`, and wires up page-level UI (screenshot via html2canvas CDN, modals, calculator pre-fill).

Object hierarchy, all in `js/`:

- **`WallArtPlanner.js`** — central controller. Owns wall dimensions, the list of `Collection`s, frame spacing, the boundary marquee, background image upload, and all state persistence (`saveState`/`loadSavedState` against the `wallArtPlannerState` localStorage key). Most operations end with `this.saveState()`.
- **`Collection.js`** — a group of identically-sized frames (one "Add New Collection" submission). Creates/restores `Frame`s, positions new frames to avoid collisions, renders the legend entry.
- **`Frame.js`** — a single frame. Computes total size (`print + 2×matt + 2×frame`), builds its DOM from the `#frameTemplate` in `index.html`, dispatches `frameMove` events, shows distance/spacing indicators.
- **`FrameDragManager.js`** — per-frame drag logic (mouse + touch): grid snapping, wall-bounds clamping, minimum-spacing collision checks, and pushing/reverting on blocked moves. Needs the `planner` reference to see all other frames.
- **`DeletionManager.js`** — transactional single-frame and delete-all logic, invoked from `WallArtPlanner`.
- **`SuggestionEngine.js`** — suggests a complementary frame size matched to the current layout bounds (reads its own controls from the DOM; `main.js` feeds it frame data and applies results back into the form).
- **`PriceCalculator.js`** — pure pricing logic. Contains the business's pricing formulas (area/linear-meter based with several sequential markups keyed to frame type 20/30/40mm). Treat the magic numbers here as business rules — don't "clean them up" without instruction.
- **`utils.js`** — `SCALE` (10 px per inch), unit converters, `DEFAULT_WALL`.
- **`BoundaryTester.js`** — debug panel; currently disabled (its instantiation is commented out in the `WallArtPlanner` constructor).

### Dead/legacy files

`js/StateManager.js` and `js/WallDimensionsManager.js` are orphaned — nothing imports them and they have no exports. The functionality they describe lives in `WallArtPlanner.js`. Don't extend them; if state or wall-dimension behavior needs changing, change `WallArtPlanner.js`.

### `functions.php`

A WordPress child-theme (Hello Elementor / WooCommerce) `functions.php` for the production site that hosts this tool. It references `lib/` and `assets/` files that are **not in this repo** and shares no code with the planner. Edit only if the task is explicitly about the WordPress/WooCommerce side.

## Critical Conventions

### Units — the #1 source of bugs

Internal canonical unit is **inches**, but the UI mixes units, and conversions happen at specific boundaries:

- Print width/height: inches everywhere.
- **Matt width: the UI input (`#mattWidth`) and `newCollection.mattWidth` are in CM.** `Collection` and `Frame` convert to inches internally (`Frame` keeps both `mattWidthCm` and `mattWidth` in inches). Data passed into a `Frame` constructor must have `mattWidth` in CM.
- **Frame width: the UI select (`#frameWidth`) uses MM string values ("20"/"30"/"40")**, converted to inches (`mmToInches`) before being stored on `newCollection`/`Collection`/`Frame`.
- Rendering: `SCALE = 10` pixels per inch (utils.js).
- Pricing: `PriceCalculator` converts inches → cm before applying formulas.

When touching any code that moves dimension values between the DOM, `newCollection`, `Collection`, `Frame`, or localStorage, check the expected unit at each hop — existing code comments flag units for this reason.

### localStorage keys (cross-page data flow)

- `wallArtPlannerState` — full planner state (wall, collections/frames, gridSize, frameSpacing). Saved by `WallArtPlanner.saveState()`, also on `beforeunload`; a `storage` event listener revalidates on external changes.
- `newFrameData` — one-shot handoff from the calculators to the planner's "Add New Collection" form (`printWidth`/`printHeight` in inches, `matWidth` in CM, `frameWidth` in inches). `main.js` consumes and removes it on load.
- `orderSummary` — consumed by `order-form.html`.

### Other patterns

- Classes take a `planner` reference as a constructor argument to query live frame data (e.g. `planner.getAllFrameObjects()` for collision checks); preserve this wiring when creating `Collection`/`Frame` objects.
- Frames communicate position changes by dispatching `frameMove` custom events; `wallDimensionsChanged` is dispatched on the wall canvas.
- DOM lookups are defensive (`if (element)`) so `main.js` can run on pages missing planner elements — follow suit for any new element wiring.
- Frame visuals come from the `<template id="frameTemplate">` in `index.html`; frame-related CSS lives in the single `styles.css`.
