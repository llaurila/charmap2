# Text Inspector

## Status

Proposed roadmap item. This document expands the `Text Inspector` entry in `specs/ROADMAP.md`.

## Product summary

Text Inspector is a dedicated Charmap2 mode for pasting arbitrary text and understanding the Unicode content of that string. Unlike the main search flow, it starts from whole-text input and breaks that input into ordered code points, surfacing invisible, combining, control, and format characters clearly.

The first version is code-point-first, not grapheme-first. It is meant to help with debugging, authoring, QA, support, and copy-paste investigation.

## Current decisions

- Ship Text Inspector as a first-class app mode alongside search.
- Keep the existing detail panel as the deep-dive view for the selected inspected unit.
- Make warnings a core part of the first release, not later polish.
- Add a header-level `...` menu for secondary actions.
- Use compact row-based inspection UI instead of result cards.
- Defer grapheme grouping and richer sequence semantics to later iterations.

## Goals

- Explain exactly what characters are present in a pasted string.
- Make hidden or risky characters easy to spot quickly.
- Help users understand why visually similar strings behave differently.
- Provide useful string-level copy and export actions for common debugging workflows.
- Reuse the existing metadata, rendering, and copy infrastructure where possible.
- Keep the experience fully static, client-side, and mobile-friendly.

## Non-goals for v1

- Grapheme-cluster-first inspection.
- Full emoji sequence interpretation.
- Full confusable-string analysis.
- Font diagnostics or local font enumeration.
- Saved inspector sessions or backend storage.
- Exhaustive prose explanations for every possible string pattern.

## Primary use cases

- Find a no-break space, zero-width character, or bidi control in pasted text.
- Inspect copied content from Word, PDF, email, chat, or documentation.
- Compare strings that look the same but behave differently.
- Turn a string into a code point list or escaped representation.
- Select one suspicious character and inspect it in the existing detail panel.

## UX model

### App mode

Text Inspector is a first-class mode in the center workflow. When inspector mode is active, it replaces the search-results surface rather than trying to share the same list UI.

### Desktop layout

- Keep the current application shell.
- Show inspector input, summary, warnings, and inspected rows in the center column.
- Keep the current detail panel on the right.
- Keep existing side content available, but allow inspector mode to visually prioritize the center workflow.

### Mobile layout

- Place the mode switch near the top.
- Show inspector input first, then summary and warnings, then inspected rows.
- Reuse the current mobile detail scroll behavior when a row is selected.
- Keep the `...` menu easy to tap and large enough for touch.

### Inspector header

The inspector header should contain:

- title
- short explanatory copy
- primary actions: `Analyze` and `Reset`
- header-level `...` menu for secondary actions

### `...` menu

V1 menu items:

- Copy raw text
- Copy code point list
- Copy JavaScript escaped string
- Copy HTML escaped string
- Show only suspicious characters
- Show only invisible characters
- Clear input

Later menu items:

- Copy JSON escaped string
- Copy CSS escaped string
- Share inspector state
- Collapse all warnings

## Functional requirements

### Input

- Accept pasted or typed arbitrary text, including spaces, tabs, and newlines.
- Preserve the original text exactly as entered.
- Support live analysis for short input and explicit re-analysis for larger input if needed.
- Reset clears the current input and analysis state.

### Analysis model

- Split input by Unicode code point in v1.
- Preserve order exactly as pasted.
- Track row index and approximate line and column position.
- Expose every pasted code point even when that character is hidden by default in browse mode.
- Do not silently discard private-use, noncharacter, or surrogate values if they appear in the input.

### Summary

- Show counts for code points, lines, invisible or control characters, and warnings.
- Show whether suspicious content is present.
- Keep the summary compact enough to stay visible near the top of the workflow.

### Row breakdown

Each inspected row should show:

- index or position
- glyph or placeholder rendering
- primary name
- code point
- kind or flag badges
- optional warning markers

Interaction rules:

- clicking or pressing Enter on a row selects it
- the selected row drives the existing detail panel
- rows should be compact and table-like, not card-based

### Warnings

Warnings are curated and high-signal. V1 warning groups:

- zero-width characters
- no-break spaces and unusual spaces
- bidi controls
- control characters
- combining marks without an obvious base neighbor
- repeated or clustered invisible format characters
- mixed whitespace variants in the same string

Each warning should:

- explain what was found
- show a count
- jump to the first relevant row when selected

### Filtering

V1 supports quick filtering for:

- All
- Suspicious
- Invisible

Advanced filtering can move into later iterations.

### Copy and export

- String-level copy actions should use the whole inspected input, not the selected row.
- V1 outputs:
  - raw text
  - code point list
  - JavaScript escaped string
  - HTML escaped string
- Per-character copy remains handled by the existing detail panel.

### Detail panel integration

- Selecting a row reuses the current detail panel.
- Rich metadata should continue to lazy-load by block.
- Inspector mode should make it clear that the selected detail came from inspected text, not search results.

### Performance

- Keep all analysis client-side.
- Short inputs should feel immediate.
- Long inputs may use debouncing, explicit analysis, or virtualization.
- Do not block the rest of the app while analysis runs.

### Accessibility

- Full keyboard access for rows, warnings, and the `...` menu.
- Invisible, format, and control rows need explicit labels, not just color treatment.
- The menu needs focus management, Escape handling, and focus return to the trigger.
- Copy feedback should follow the same accessible announcement pattern as the current detail panel.

## Architecture and implementation approach

### Reuse existing systems

- `src/App.tsx` for app shell and mobile detail scrolling.
- `src/hooks/useAppViewModel.ts` for cross-panel state orchestration.
- `src/components/DetailPanel.tsx` for deep-dive character inspection.
- `src/hooks/useUnicodeData.ts` for block index and lazy block loading.
- `src/utils/rendering.ts` for glyph and placeholder rendering.
- `src/utils/copyFormats.ts` for per-code-point formatting primitives.
- `src/utils/clipboard.ts` for clipboard writes.
- `src/styles.css` for desktop and mobile layout rules.

### New app state

Add inspector-specific state alongside the existing search flow:

- `appMode: "search" | "inspector"`
- `inspectorInput`
- `inspectorAnalysis`
- `inspectorFilter`
- `inspectorSelectedIndex`
- `isInspectorMenuOpen`

The existing `selectedCp` remains the shared selection key for the detail panel.

### Suggested data model

```ts
type InspectorUnit = {
  id: string;
  index: number;
  cp: number;
  text: string;
  kind: CharacterKind;
  name?: string;
  aliases?: string[];
  block?: string;
  script?: string;
  flags: string[];
  line: number;
  column: number;
  warningTags: string[];
};

type InspectorWarning = {
  id: string;
  title: string;
  description: string;
  count: number;
  firstIndex: number;
};

type InspectorSummary = {
  codePointCount: number;
  lineCount: number;
  invisibleCount: number;
  warningCount: number;
  hasSuspiciousContent: boolean;
};
```

### Metadata resolution

- Use lightweight metadata when it is already available from the search index.
- Reuse lazy block loading when richer metadata is needed for the selected row.
- Do not require full detail data to render the first inspector list.
- Keep surrogate, private-use, and noncharacter values inspectable even when they are normally hidden from browse mode.

### Suggested file additions

- `src/components/TextInspectorPanel.tsx`
- `src/components/TextInspectorList.tsx`
- `src/components/TextInspectorRow.tsx`
- `src/components/TextInspectorWarnings.tsx`
- `src/components/OverflowMenu.tsx`
- `src/hooks/useTextInspector.ts`
- `src/utils/textInspector.ts`
- `src/utils/textInspectorCopy.ts`
- `src/utils/textInspector.test.ts`

### Suggested file changes

- `src/App.tsx`
- `src/hooks/useAppViewModel.ts`
- `src/components/SearchPanel.tsx` or a sibling mode-switch component
- `src/styles.css`
- `src/App.test.tsx`

## Implementation plan

### Phase 0: lock the product contract

- Confirm the inspector entry point and final label.
- Confirm the header-level `...` menu contents.
- Confirm the initial warning set.
- Confirm the threshold for live vs explicit analysis on large input.

### Phase 1: build the inspector shell

- Add app mode state and switch between search and inspector.
- Create `TextInspectorPanel` with input, header, `Analyze`, `Reset`, and empty state.
- Build a pure parser that converts input text into ordered code-point units.
- Render a compact list of inspected rows.
- Wire row selection to the existing detail panel.
- Ensure mobile row selection scrolls to the detail panel just like current search results and pinned items.

### Phase 2: add the warning engine

- Implement curated warning detection.
- Add a summary strip and warnings panel.
- Support jumping from a warning to the first relevant row.
- Add per-row warning markers and suspicious state.

### Phase 3: add the `...` menu and string actions

- Build an accessible header-level overflow menu.
- Add whole-text copy and export actions.
- Add quick view filters for suspicious and invisible content.
- Add outside-click, Escape, and focus-return behavior.

### Phase 4: polish and scale

- Add keyboard row navigation.
- Improve long-input behavior with debounce or explicit analysis thresholds.
- Add virtualization if real usage shows it is needed.
- Refine mobile layout and sticky action affordances.
- Add session persistence if it proves useful.

### Phase 5: post-v1 iteration

- Add grapheme-cluster grouping view.
- Add richer emoji and variation-selector awareness.
- Add shareable URLs or saved sessions.
- Add deeper string-level diagnostics and confusable analysis.

## Testing plan

### Unit tests

- code point splitting
- newline preservation
- astral code points
- lone surrogates
- zero-width characters
- no-break spaces and mixed whitespace
- combining marks without obvious base
- string-level copy outputs

### Component and integration tests

- switching between search and inspector
- analysis updates rows
- row selection updates the detail panel
- warnings jump to rows
- the `...` menu opens, keyboard navigates, and closes correctly
- mobile behavior still scrolls to the detail panel

### Manual verification

- paste text from Word, PDF, chat, email, and documentation
- inspect emoji with ZWJ and skin-tone modifiers
- inspect bidi controls and whitespace-only strings
- inspect long multiline content
- verify copy and export outputs in JavaScript and HTML contexts

## Deferred follow-ups

- Grapheme-first alternative view
- Per-line grouped display
- Save or share inspector sessions
- Confusable-string analysis
- Font fallback diagnostics
