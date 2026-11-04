# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project currently uses date-based release notes alongside the project version.

## [Unreleased]

## [0.3.0] - 2026-11-04

Introduces Text Inspector as a single-string diagnostic tool for understanding hidden characters and unexpected Unicode behavior.

### Added

- Added a dedicated Text Inspector mode with live analysis, an annotated text preview, and a compact code-point breakdown linked to character details.
- Added contextual findings with Information, Worth checking, and Potential problem levels, plus previous/next occurrence navigation.
- Added diagnostics for unusual and mixed spaces, bidi controls, invisible format clusters, combining marks, variation selectors, lone UTF-16 surrogates, private-use characters, and noncharacters.
- Added visible All, Findings, and Invisible filters, opt-in example text, and keyboard-accessible copy/export previews for raw text, code point lists, JavaScript string literals, and HTML numeric references.
- Added explicit warnings for lossy HTML output and background analysis with paged previews and rows for longer text.

### Changed

- Kept inspector input, findings, and output together in the workspace, with contextual occurrence information in the existing detail panel.
- Clarified input preservation, logical line counts, UTF-16 positions, and the limits of diagnostic findings; comparison and normalization diagnostics remain outside this initial release.

### Fixed

- Prevented pending search updates from overriding inspector selection and cleared stale occurrence selection and copy feedback after input edits.
- Made essential diagnostic classification independent of lazily loaded detail metadata, including bidi control detection.
- Fixed lazy-loaded character details remaining stuck on Loading after React Strict Mode effect replay in development.
- Kept sidebar panels stacked directly beneath each other, with unused vertical space at the bottom, and prevented finding navigation from scrolling away to the breakdown.

## [0.2.2] - 2026-11-04

### Added

- Added cookieless GoatCounter usage analytics on the official production site and a footer privacy explanation.

### Changed

- Migrated dependency management, development commands, and CI workflows from npm to pnpm.
- Upgraded the vendored Unicode Character Database and generated search and detail assets from Unicode 17.0.0 to 18.0.0, including algorithmic names for Jurchen and Small Seal characters.

### Fixed

- Sorted parsed Unicode property ranges before binary search so script and age metadata are resolved correctly.

## [0.2.0] - 2026-03-21

Improves deployed update checks and introduces a mobile-optimized UI for searching and inspecting characters on phones.

### Added

- Added build metadata generation and a same-origin `build-meta.json` endpoint for deployed version checks.
- Added an in-app update banner with reload and dismiss actions when a newer build is available.

### Changed

- The app now compares the running build against deployed metadata on load, on an interval, and when the tab becomes visible again.
- Improved the mobile UI with collapsible header and pinned panels, tighter search controls, and better mobile navigation to character details.

## [0.1.2] - 2026-03-21

Adds browser-persistent pinned characters and smooths how pinned selections restore across searches and background Unicode hydration.

### Added

- Added browser-persistent pinned characters with a new left-rail pinned panel and detail-panel pin toggle.

### Changed

- Clicking a pinned character now clears the active search and featured-set filter before restoring its detail view.
- Preserved pinned selections outside the current search index while loaded Unicode data hydrates in the background.

## [0.1.1] - 2026-03-20

Small polish release for the initial public build.

### Fixed

- Adjusted the three-panel workspace layout so the results panel fills available horizontal space more reliably.
- Prevented the detail panel from stretching to the full height of the results column, removing the empty space at the bottom.

## [0.1.0] - 2026-03-20

First public release.

### Added

- Search-first Unicode character map UI built with Vite, React, and TypeScript.
- Character lookup by pasted character, code point, name, alias, block, script, and related keywords.
- Detail panel with glyph preview, metadata, aliases, Unicode age, flags, and case mapping.
- One-click copy actions for raw characters and common escaped formats.
- Virtualized results grid and lazy loading of per-block Unicode detail data.
- Unicode ingestion and generation scripts based on vendored Unicode Character Database files for Unicode 17.0.0.
- Generated static Unicode JSON assets committed for out-of-the-box local development and deployment.
- Automated tests covering Unicode parsing helpers, search behavior, and copy-format generation.
- Open-source project scaffolding including MIT licensing, third-party notices, contribution guidance, code of conduct, security policy, GitHub issue templates, PR template, and CI.

### Notes

- The current MVP focuses on single Unicode code points, including single-code-point emoji.
- Multi-code-point emoji sequences, named sequences, favorites, recent characters, and deeper CJK enrichment remain future work.
- The project is configured for deployment on GitHub Pages at `https://llaurila.github.io/charmap2/`.
