# Charmap2

Charmap2 is a static web-based Unicode character map built to replace the parts of Windows Character Map that people actually need, without the clumsy UI that comes with it.

## The problem

Windows Character Map is useful, but everyday tasks are harder than they should be. Search is weak, browsing is awkward, inspecting a character takes too many clicks, and copying text feels like working around the tool instead of using it. It is also a Windows-first utility, while many people now move between Windows and macOS.

Charmap2 fixes that by moving the experience into the browser:

- fast search by name, alias, abbreviation, or code point
- a large preview of the selected character
- clear metadata and plain-English descriptions for special characters
- one-click copy for the raw character and common escaped forms
- a static site that works well on Windows and macOS

## Scope

The first version focuses on single Unicode code points, including single-code-point emoji. Multi-code-point emoji sequences, named sequences, and other composed sequences come later.

## Technical direction

- Vite
- React
- TypeScript
- static hosting with no backend
- official Unicode Character Database files as the source of truth

## Status

This repository currently contains the product and implementation plan. See `SPECS.md` for the locked specification.
