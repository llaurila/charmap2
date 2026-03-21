# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project currently uses date-based release notes alongside the project version.

## [Unreleased]

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
