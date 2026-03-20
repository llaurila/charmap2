# SPECS

## Product summary

Charmap2 is a static web application for finding, inspecting, and copying Unicode characters. It is a search-first replacement for Windows Character Map with a cleaner browser UX, better search, better copy behavior, and clearer metadata.

The MVP focuses on single Unicode code points only.

## Locked decisions

- Ship as a static website.
- Use Vite, React, and TypeScript.
- Pin Unicode data to a specific version instead of using `latest`.
- Start with Unicode `17.0.0`.
- Use the official Unicode Character Database files as the source of truth.
- Vendor raw Unicode source files locally and generate app data at build time.
- Treat the app as Unicode-first, not font-first.
- Use system UI fonts for interface text and browser font fallback for glyph preview.
- Support single code points first, including single-code-point emoji.
- Defer multi-code-point emoji sequences, named sequences, and local font enumeration to later phases.

## Goals

- Make finding a character dramatically faster than Windows Character Map.
- Make copying a character frictionless in the browser.
- Show the selected character in a large preview with useful metadata.
- Handle invisible, combining, control, and format characters in a way that is understandable.
- Work well on Windows and macOS without requiring a backend.
- Keep the site fast enough to browse large Unicode blocks.

## Non-goals for MVP

- No multi-code-point emoji sequences or flag sequences.
- No named character sequences.
- No local font browser as a core workflow.
- No backend, database, or server-side search.
- No attempt to provide exhaustive prose descriptions for every code point.

## Stack

- App: Vite + React + TypeScript
- Hosting: static hosting only
- Search: prebuilt client-side index generated at build time
- Rendering: browser-native font fallback
- Data ingestion: local build scripts over vendored Unicode source files

## Unicode source of truth

Use the official versioned Unicode archive, not `latest`.

- Base URL: `https://www.unicode.org/Public/17.0.0/ucd/`
- Primary file: `https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt`

Vendored source files should live under:

```text
vendor/unicode/17.0.0/
```

The build should read vendored files, not fetch from the network at runtime.

## Data sources

| File | Purpose | Machine-parse | Notes |
| --- | --- | --- | --- |
| `UnicodeData.txt` | Core per-code-point data | Yes | Main spine of the dataset. Must handle `First` and `Last` ranges correctly. |
| `NameAliases.txt` | Formal aliases and abbreviations | Yes | Critical for controls and common search terms like `NBSP`, `ZWJ`, `BOM`, `TAB`. |
| `Blocks.txt` | Unicode block | Yes | Useful for grouping and browsing, not semantic identity. |
| `Scripts.txt` | Script property | Yes | Useful for filtering; many characters are `Common` or `Inherited`. |
| `DerivedAge.txt` | Unicode version introduced | Yes | Useful in detail view and filtering. |
| `PropList.txt` | Selected binary properties | Yes | Use for flags such as whitespace, bidi control, join control, dash, and quotation mark. |
| `NamesList.txt` | Editorial notes and annotations | No | Useful as human reference only. Do not machine-parse into the app. |
| `Unihan.zip` | Han definitions and readings | Later | Phase 2 for better CJK support. |

Do not use `@unicode/unicode-17.0.0` as the primary source for names and aliases. It can be useful as reference material, but the raw UCD files are the authoritative input for this project.

## Description strategy

Unicode provides authoritative names and aliases, but not polished app-friendly descriptions for every character.

MVP description strategy:

- Use the official Unicode name as the primary label.
- Generate short descriptors from known metadata, such as category, block, and special type.
- Maintain a curated override table for special characters people commonly need explained, such as:
  - no-break spaces
  - zero-width join and non-join characters
  - byte order mark
  - variation selectors
  - common dash and quote variants
  - combining marks that are confusing in isolation
- Use `NamesList.txt` only as editorial research when writing curated overrides.

## Source import and build pipeline

Recommended layout:

```text
vendor/unicode/17.0.0/
scripts/unicode/
src/
public/unicode/17.0.0/
```

Build pipeline:

1. Read `UnicodeData.txt` as the base record set.
2. Expand range-based entries and synthesize algorithmic names where required.
3. Merge aliases from `NameAliases.txt`.
4. Attach block, script, age, and selected binary properties.
5. Classify rendering and visibility behavior.
6. Attach curated descriptions where applicable.
7. Generate chunked JSON for detail views and a compact search index for initial load.

The app must not depend on raw Unicode text files in the browser.

## Range and naming rules

The ingestion step must correctly handle Unicode ranges and algorithmic names.

- Do not treat literal `First` and `Last` rows as real character names.
- Implement range-name synthesis for Hangul syllables and ideographic ranges according to Unicode rules.
- Control characters use aliases for human-readable display and search, not the placeholder name `<control>`.
- Do not invent names for private-use code points.
- Noncharacters, surrogates, and private-use code points should be labeled clearly when exposed.

## Data model

Suggested detail record:

```ts
type CharacterRecord = {
  cp: number;
  name: string;
  aliases?: string[];
  block: string;
  script: string;
  category: string;
  age?: string;
  description?: string;
  kind: "glyph" | "combining" | "whitespace" | "format" | "control";
  flags?: string[];
  decomposition?: number[];
  caseMap?: {
    upper?: number;
    lower?: number;
    title?: number;
  };
};
```

Search data should be slimmer than the detail record and should only include fields required for ranking and lookup.

## Generated data layout

Generate data into small, purpose-specific assets.

Suggested outputs:

- `public/unicode/17.0.0/search-core.json`
- `public/unicode/17.0.0/ranges.json`
- `public/unicode/17.0.0/blocks/*.json`
- `src/data/featuredSets.ts`
- `src/data/descriptionOverrides.ts`

Initial page load should only need the compact search index and featured sets. Detailed block data should be loaded lazily.

## Search

Search is the core product feature.

Supported input forms:

- pasted character
- `U+00A0`
- `0x00A0`
- plain hex such as `00A0`
- official name
- alias or abbreviation
- block name
- script name

Normalization rules:

- case-insensitive
- fold spaces, hyphens, and underscores together
- trim punctuation around code point forms where reasonable
- preserve direct code point lookup behavior

Ranking order:

1. exact pasted character match
2. exact code point match
3. exact official name or alias match
4. prefix name or alias match
5. token match across indexed terms
6. fuzzy fallback only when exact and token-based matching fail

Index these terms:

- official name
- aliases and abbreviations
- block name
- script
- curated search keywords
- generic labels such as `control`, `combining mark`, `format`, and `whitespace`

Do not dump raw `NamesList.txt` prose into the main search index.

## Visibility rules

Default browse and search behavior:

- show assigned scalar values
- show controls and useful format characters
- hide surrogates by default
- hide private-use code points by default
- hide noncharacters by default

Exact code point lookup may still expose hidden categories when the user asks for them directly.

## Rendering rules

UI font stack:

```text
system-ui, -apple-system, "Segoe UI", sans-serif
```

Glyph preview stack:

```text
system-ui, "Segoe UI Symbol", "Apple Symbols", "Segoe UI Emoji", "Apple Color Emoji", "Noto Sans Symbols 2", "Noto Color Emoji", sans-serif
```

Special rendering behavior:

- combining marks render on a dotted circle
- whitespace and invisible characters render as labeled placeholders
- control characters render as explicit labeled tiles, not empty boxes
- metadata remains useful even when platform font coverage varies

Font browsing is not an MVP feature.

## Copy formats

The detail panel should support one-click copy for:

- raw character
- `U+XXXX` form
- JavaScript escape
- CSS escape
- numeric HTML entity

If useful, copy actions can adapt between `\uXXXX` and `\u{XXXXX}` depending on code point range.

## UI layout

Desktop:

- persistent search bar
- left rail for featured sets and browsing filters
- virtualized result grid in the center
- sticky detail panel on the right

Mobile:

- search bar at the top
- result grid below
- detail panel as a bottom sheet or full-screen detail view

Landing page content should include featured sets such as:

- quotes
- dashes
- whitespace
- arrows
- currency
- math
- Greek
- box drawing

## Detail panel

The selected character panel should show:

- large glyph preview
- official name
- description
- aliases and abbreviations
- code point
- general category
- block
- script
- Unicode age
- decomposition data when useful
- case mappings when useful
- clear badges for `control`, `combining`, `whitespace`, `format`, `private-use`, `surrogate`, or `noncharacter`

## Performance

- keep runtime fully static
- build all search assets ahead of time
- virtualize long result lists
- lazy load detail data by block or chunk
- avoid shipping the full detail dataset on first paint

## Accessibility

- full keyboard navigation for search results and detail actions
- visible focus states
- labels for invisible and control characters
- copy confirmations announced accessibly
- avoid relying on color alone for special-character states

## Testing

Add tests for:

- Unicode parsing
- range expansion and algorithmic naming
- search normalization and ranking
- special rendering classification
- copy-format generation

## Implementation phases

Phase 1:

1. Vendor Unicode `17.0.0` source files.
2. Build the ingestion pipeline and generate stable JSON artifacts.
3. Build the search-first application shell.
4. Add the result grid and detail panel.
5. Add copy actions and special-character rendering.

Phase 2:

- favorites and recent characters
- multi-character copy tray
- related and confusable characters
- Unihan-backed CJK enrichment
- optional local font access as a progressive enhancement
- multi-code-point sequences
