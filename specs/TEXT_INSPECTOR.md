# Text Inspector

## Status

The first diagnostic slice ships in v0.3.0. This document expands the `Text Inspector` entry in `specs/ROADMAP.md` and defines the diagnostic direction for incremental improvement of the existing implementation.

This is a product contract, not a description of everything the current code already supports. Improve the existing foundation rather than treating this as a greenfield rewrite. The first publishable slice and subsequent increments are separated in the implementation plan.

## Product summary

Text Inspector is a single-string diagnostic tool in Charmap2. Its central promise is: **paste text, see what is unusual, and understand where and why it matters.** Unlike search, it starts from whole-text input and explains relevant Unicode behavior in the context of that text.

The underlying analysis remains code-point-first, not grapheme-first. An annotated preview and curated findings make that analysis useful; the ordered code-point breakdown and existing detail panel provide the deeper inspection layer. It is meant to help with debugging, authoring, QA, support, and copy-paste investigation.

## Current decisions

- Ship Text Inspector as a first-class app mode alongside search.
- Keep the existing detail panel as the deep-dive view for the selected inspected unit.
- Make context and trustworthy findings core parts of the first release, not later polish.
- Keep input and diagnostic output together in the inspector workspace.
- Use an inspector-header `...` menu for secondary copy and export actions, not primary filtering.
- Use compact row-based inspection UI instead of result cards.
- Distinguish informational observations from potential problems; invisible does not automatically mean suspicious.
- Preserve input without automatic cleanup or normalization.
- Leave two-string comparison out of this feature's current scope.
- Deliver a useful diagnostic slice first; add normalization diagnostics and richer sequence explanations in subsequent increments.
- Defer grapheme grouping and full emoji sequence interpretation.

## Goals

- Explain exactly what characters are present in a pasted string.
- Make hidden characters and potential problems easy to locate in surrounding text.
- Explain how relevant characters affect spacing, line breaking, shaping, ordering, or parsing.
- Avoid noisy warnings for ordinary text and avoid implying that an absence of findings certifies text as safe.
- Provide useful string-level copy and export actions for common debugging workflows.
- Reuse the existing metadata, rendering, and copy infrastructure where possible.
- Keep the experience fully static, client-side, and mobile-friendly.

## Non-goals for v1

- Grapheme-cluster-first inspection.
- Two-string comparison, equality checks, or a diff interface.
- Full emoji sequence interpretation.
- Full confusable-string analysis.
- Automatic cleanup, character removal, or normalization of the input.
- Font diagnostics or local font enumeration.
- Saved inspector sessions or backend storage.
- Exhaustive prose explanations for every possible string pattern.

## Primary use cases

- Find a no-break space, zero-width character, or bidi control in pasted text.
- Inspect copied content from Word, PDF, email, chat, or documentation.
- Locate a finding in its original line and surrounding text, then visit other occurrences.
- Understand whether a hidden character is expected or worth investigating.
- Turn a string into a code point list or escaped representation.
- Select a character or finding and inspect it in the existing detail panel.
- In a subsequent increment, understand whether canonical normalization changes the input and which sequences are affected.

## UX model

### App mode

Text Inspector is a first-class mode in the center workflow. When inspector mode is active, it replaces the search-results surface rather than trying to share the same list UI.

### Desktop layout

- Keep the current application shell.
- Show inspector input, summary, annotated preview, findings, and inspected rows in the center column.
- Keep the current detail panel on the right.
- Keep existing side content available without letting search-only controls or placeholder panels interrupt the inspector workflow.
- Do not split inspector input into the global app header while its results remain in a separate workspace panel.

### Mobile layout

- Place the mode switch near the top.
- Show inspector input first, then summary, preview and findings, then inspected rows.
- Keep short explanations and occurrence navigation usable without requiring a trip to the detail panel.
- Reuse the current mobile detail scroll behavior for explicit character inspection. Finding navigation should reveal its text context, not immediately scroll away from it.
- Keep the `...` menu easy to tap and large enough for touch.

### Inspector header

The inspector header should contain:

- title
- short explanatory copy
- one clear `Clear text` action, disabled when the input is empty
- analysis status and an `Analyze` action only when the long-input policy requires explicit analysis
- inspector-header `...` menu for secondary actions

Short input is analyzed live and does not need an otherwise redundant `Analyze` button. Do not duplicate clear/reset actions across the app header, inspector header, and menu.

### `...` menu

V1 menu items:

- Copy raw text
- Copy code point list
- Copy JavaScript string literal
- Copy HTML numeric references

Keep `All`, `Findings`, and `Invisible` filters visible beside the breakdown. They are part of the primary inspection workflow, not hidden export actions.

Later menu items:

- Copy JSON escaped string
- Copy CSS escaped string
- Share inspector state
- Collapse all findings

## Functional requirements

### Input

- Accept pasted or typed arbitrary text, including spaces, tabs, and newlines.
- Preserve the input string received by the app; do not trim, normalize, remove, or replace characters during analysis.
- Be explicit about the input boundary: browser textarea input normalizes CRLF and CR to LF. Do not claim to preserve original clipboard bytes or original newline encodings. File import or raw clipboard preservation is not required for the first release.
- Support live analysis for short input and explicit re-analysis for larger input if needed.
- `Clear text` clears input, analysis, filters, selection, and inspector feedback.
- Offer a few opt-in examples, such as a no-break space, a zero-width character, and a bidi control. Examples must never replace nonempty input without an explicit user action.

### Analysis model

- Split input by Unicode code point in v1.
- Preserve the received string's order exactly.
- Track zero-based code-point index and UTF-16 start/end offsets for each unit. Display one-based positions to users.
- Track one-based logical line and code-point column, not visual display columns. Tabs occupy one code-point column; astral characters occupy one code-point column and two UTF-16 code units.
- For logical line counting, treat CRLF as one break and lone CR, LF, NEL, LINE SEPARATOR, and PARAGRAPH SEPARATOR as breaks. Preserve their units in the parser. A trailing break creates an empty final line; empty input has zero lines. These rules apply to the string received by the parser, even if textarea input has already normalized CR/CRLF.
- Expose every pasted code point even when that character is hidden by default in browse mode.
- Do not silently discard private-use, noncharacter, or surrogate values if they appear in the input.
- Represent lone surrogates as retained UTF-16 values, not valid Unicode scalar values. Give surrogate, private-use, noncharacter, and unassigned values explicit classifications and fallback labels.
- Keep diagnostic properties separate from rendering kind. For example, a variation selector can be classified as combining while still being invisible in isolation.

### Summary

- Show counts for code points, logical lines, invisible or control characters, and finding groups.
- Count finding groups once each; individual findings show their own occurrence count. If an affected-character count is shown, deduplicate units across overlapping findings and label it separately.
- The invisible/control count includes whitespace, controls, format characters, and explicitly classified invisible marks such as variation selectors. It does not count every combining mark as invisible.
- Distinguish informational findings from findings worth checking or potential problems.
- An empty result means no findings from the implemented checks, not that the text is safe or free of all Unicode issues.
- Keep the summary compact enough to stay visible near the top of the workflow.

### Annotated text preview

- Show readable surrounding text and preserve logical line structure.
- Make invisible characters visible with distinct text labels such as `SPACE`, `NBSP`, `ZWJ`, `TAB`, and `LF`, rather than generic kind labels alone.
- Show safe placeholders for controls, lone surrogates, and other values that cannot be meaningfully rendered.
- Render diagnostic annotations in logical order with bidi isolation; pasted directional controls must not reorder diagnostic labels or app UI. This is a diagnostic representation, not an exact font or visual-layout simulation.
- Selecting an annotation or breakdown row highlights the corresponding occurrence in both views.
- Selecting a finding reveals its relevant range and a short surrounding-text excerpt. Previous/next controls visit every occurrence and show the current occurrence number.
- The preview is read-only; edits happen in the input. Do not add a second editor or silently transform the text.

### Row breakdown

Each inspected row should show:

- index or position
- glyph or placeholder rendering
- primary name
- code point
- kind or flag badges
- relevant diagnostic flags and optional finding markers

Interaction rules:

- clicking or pressing Enter on a row selects it
- the selected row drives the existing detail panel
- rows should be compact and table-like, not card-based
- repeated instances of the same code point remain independently selectable by occurrence
- editing the input clears the occurrence selection in the first implementation, preventing stale index/code-point pairs
- changing a filter must not leave a hidden row as the keyboard's active item

### Findings and severity

Findings are curated observations, not a blanket warning for every invisible character. Use three clearly labeled levels:

- **Information:** expected structural or formatting characters and neutral observations.
- **Worth checking:** characters or patterns with behavior that may be unexpected in this text.
- **Potential problem:** malformed values or patterns with a concrete diagnostic reason for concern.

The initial rule set should cover:

| Group | Initial behavior |
| --- | --- |
| Tabs and line breaks | Informational, compact, and grouped; ordinary multiline text must not be described as suspicious merely because it contains them. |
| Zero-width characters | Explain shaping or line-break behavior. ZWJ/ZWNJ presence alone is informational, not proof of a problem; unexpected or repeated patterns may be worth checking. |
| No-break and unusual spaces | Worth checking; explain the difference from an ordinary space, including no-break behavior where applicable. |
| Mixed whitespace variants | Worth checking when distinct horizontal space variants coexist, not merely when a string contains spaces and line breaks. Include the variants and their counts. |
| Bidi controls | Always identify and explain their ordering effect. Distinguish directional marks and isolates from overrides; overrides are potential problems, while balanced legitimate usage is not automatically invalid. |
| Other controls | Worth checking or potential problems based on the specific control and its behavior; do not treat all controls identically. |
| Combining marks without an obvious base | Worth checking, explicitly described as a heuristic rather than proof that the sequence is invalid. Variation selectors need their own handling, not a generic orphan-mark warning. |
| Repeated or clustered invisible format characters | Worth checking; report the involved range and pattern, not merely independent zero-width occurrences. |
| Lone surrogates and noncharacters | Explicit potential-problem findings explaining malformed UTF-16 or interchange limitations respectively. Private-use values are informational and may be intentional. |
| Variation selectors | Informational explanation of presentation/variant selection; unexpected placement may be worth checking. No full emoji sequence interpretation is required for the first slice. |

For each rule, document its predicate, severity, occurrence definition, and representative positive/negative examples in tests. Avoid implying that a heuristic understands author intent or exhaustively validates Unicode sequences.

Each finding should:

- explain what was found and the relevant behavior in plain language
- show a severity label, occurrence count, and affected code points or range
- retain all occurrence ranges, not only the first row index
- reveal context and support previous/next occurrence navigation
- link to explicit character inspection for richer metadata

Keep informational groups visually secondary and compact so they do not bury findings worth checking. Rule results must not change merely because a user selected a character or loaded another metadata block.

### Filtering

V1 supports quick filtering for:

- All
- Findings
- Invisible

`Findings` shows units covered by findings worth checking or potential problems; informational-only observations do not make every tab or newline appear in this view. `Invisible` follows the same explicit properties as the summary count.

Show the active filter and visible/total unit counts. Distinguish no input, no findings, and no matches for the current filter. Offer a clear route back to `All` when a filter has no matches.

Advanced filtering can move into later iterations.

### Copy and export

- String-level copy actions should use the whole current input, not the selected row or filtered subset. Disable derived exports while analysis is stale rather than copying an older snapshot as if it were current.
- V1 outputs:
  - raw text: the exact current input string held by the app
  - code point list: ordered `U+XXXX` values separated by spaces, retaining lone-surrogate values with their classification visible in the inspector
  - JavaScript string literal: a double-quoted literal using `\uXXXX` and `\u{XXXXX}` escapes, preserving the original UTF-16 string including lone surrogates
  - HTML numeric references: `&#x...;` references intended for an HTML text-node context, not a universal HTML/attribute escape format
- Show an output preview and label its intended context before copying derived formats.
- HTML parsing cannot round-trip all retained values: lone surrogates, NUL, and some legacy control references are replaced or remapped. Identify these cases and warn before copying a lossy representation. Never silently drop such values or promise exact HTML round-tripping.
- Per-character copy remains handled by the existing detail panel.

### Canonical normalization diagnostics (subsequent increment)

- Report whether NFC or NFD changes the single input string.
- Show affected sequences and their original/normalized code-point representations, linked to input ranges where practical.
- Explain canonical equivalence without presenting it as a comparison feature or a text-safety check.
- Keep the original input unchanged. Any future normalized-copy action must be explicitly labeled and separate from raw copy.
- Defer compatibility normalization (NFKC/NFKD), which can change meaningful distinctions, rather than presenting it as a generic repair action.
- Normalization diagnostics are not a prerequisite for publishing the first useful diagnostic slice.

### Detail panel integration

- Selecting a row reuses the current detail panel.
- Rich metadata should continue to lazy-load by block.
- Inspector mode should identify the selected occurrence as coming from inspected text, with line/column and a context excerpt where useful.
- Search auto-selection and pending search updates must not override inspector selection. Retain search state separately for returning to search mode.
- Empty input and cleared occurrence selection must not display an unrelated search result as though it came from the inspected text.

### Performance

- Keep all analysis client-side.
- Short inputs should feel immediate.
- Build a code-point metadata map once; do not scan the entire search index for every input code point.
- Define and test the live-analysis threshold, large-input scheduling strategy, and supported input limits before publication. Larger input may use explicit analysis, chunked work, or a worker.
- Keep editing responsive and show current, pending, stale, or unsupported-input status honestly. Do not silently truncate input or inspection results.
- Bound row and preview DOM size through virtualization or another measured rendering strategy when needed. A scroll container alone does not bound rendering cost.
- Generate derived export strings on demand rather than eagerly rebuilding every format on each keystroke.
- Do not block the rest of the app while analysis runs.

### Accessibility

- Full keyboard access for rows, preview annotations, findings, occurrence navigation, filters, and the `...` menu.
- Use coherent list/table semantics. If using a listbox, implement its keyboard/focus model, including arrow navigation and a single active tab stop; adding ARIA roles alone is not sufficient.
- Invisible, format, and control rows need explicit labels, not just color treatment.
- Severity and selected-occurrence state need text equivalents, not color alone.
- The menu needs keyboard navigation, outside-click dismissal, Escape handling, and focus return to the trigger.
- Keep focus predictable after filtering, clearing input, navigating occurrences, and closing export UI.
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

### Inspector state and selection ownership

Retain inspector-specific state alongside the existing search flow:

- `appMode: "search" | "inspector"`
- `inspectorInput`
- `inspectorAnalysis`
- `inspectorFilter`
- `inspectorSelectedIndex`
- `isInspectorMenuOpen`
- pending/current analysis status and input revision, if analysis is asynchronous or explicit

Occurrence selection is authoritative in inspector mode. The existing `selectedCp` can remain the shared metadata lookup key, but it must be synchronized from the selected inspector occurrence, not independently changed by search effects. Clear stale occurrence selection on input edits and reject asynchronous results for older input revisions.

### Suggested data model

```ts
type InspectorUnit = {
  id: string;
  index: number;
  cp: number;
  text: string;
  utf16Start: number;
  utf16End: number;
  kind: CharacterKind;
  name?: string;
  aliases?: string[];
  block?: string;
  script?: string;
  flags: string[];
  line: number;
  column: number;
  diagnosticProperties: string[];
  findingIds: string[];
};

type InspectorOccurrence = {
  startIndex: number;
  endIndex: number; // Exclusive code-point index.
  utf16Start: number;
  utf16End: number; // Exclusive UTF-16 offset.
};

type InspectorFinding = {
  id: string;
  severity: 'information' | 'check' | 'problem';
  title: string;
  description: string;
  occurrences: InspectorOccurrence[]; // Count is derived from this list.
};

type InspectorSummary = {
  codePointCount: number;
  lineCount: number;
  invisibleCount: number;
  findingGroupCount: number;
  checkOrProblemGroupCount: number;
};
```

These names describe the target model; migrate existing warning types incrementally. Keep parser/classification, finding rules, presentation, and export formatting independently testable.

### Metadata resolution

- Use lightweight metadata when it is already available from the search index.
- Reuse lazy block loading when richer metadata is needed for the selected row.
- Do not require full detail data to render the first inspector list.
- Keep surrogate, private-use, and noncharacter values inspectable even when they are normally hidden from browse mode.
- Essential diagnostic properties must be available independently of lazy block detail loading. Use small generated property/range data or explicit code-point checks as appropriate; do not infer bidi controls solely from flags absent in the search index.
- Loading rich metadata may enrich names/descriptions, but must not change the core classification, finding severity, or counts.
- Handle metadata loading/error states explicitly rather than briefly claiming there are no problems before classification is available.

### Existing foundation and possible extractions

The panel, hook, parser/export helpers, and tests already exist. Extend them in small steps; extract components when responsibilities warrant it rather than creating every file up front. Candidate boundaries:

- `src/components/TextInspectorPanel.tsx`
- `src/components/TextInspectorList.tsx`
- `src/components/TextInspectorRow.tsx`
- `src/components/TextInspectorPreview.tsx`
- `src/components/TextInspectorFindings.tsx`
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

### Phase 0: lock rule and performance details

- Keep the agreed single-string diagnostic direction; do not reopen comparison scope as a prerequisite.
- Translate the initial rule policy into exact predicates, severities, and fixtures.
- Confirm the live/explicit analysis threshold and long-input rendering strategy with measurements.
- Confirm preview labels and export lossiness rules.

The v0.3.0 analysis policy: live analysis up to 4,000 UTF-16 units;
explicit worker-based analysis up to 100,000 UTF-16 units; larger input remains intact but
is marked unsupported for analysis. Preview pages contain at most 200 code points and breakdown
pages at most 100 rows. These are tunable limits, not Unicode string-size constraints.

### Phase 1: make the existing foundation trustworthy

- Fix metadata-independent bidi detection and explicit hidden-value classifications.
- Add UTF-16 ranges and consistent logical position/count semantics.
- Separate inspector selection from search auto-selection and clear it on input edits.
- Distinguish information from findings worth checking; implement the missing mixed-whitespace and clustered-format rules.
- Correct filtered-empty states, export contracts, and lossy HTML feedback.
- Implement keyboard/focus behavior alongside affected UI changes, not as post-release polish.

### Phase 2: deliver the first useful diagnostic workflow

- Consolidate input, a single clear action, and outputs in the inspector workspace.
- Add the annotated preview and plain-language contextual findings.
- Link preview, findings, occurrence navigation, breakdown selection, and character details.
- Make All / Findings / Invisible filters visible and make rows genuinely compact.
- Keep informational observations secondary; ensure ordinary multiline text does not look like a problem report.
- Complete accessible export previews/menu behavior and measured long-input handling.
- Verify the first-release acceptance criteria below, then publish this slice without waiting for subsequent increments.

### Phase 3: add canonical normalization diagnostics

- Add NFC/NFD status and original/normalized sequence explanations for the single input.
- Keep diagnostics read-only and explain canonical equivalence.
- Test combining sequences, astral characters, and retained malformed values.

### Phase 4: enrich explanations based on usage

- Improve contextual explanations for common emoji joiners, variation selectors, and shaping sequences without requiring full sequence interpretation.
- Refine rule noise, mobile navigation, and performance using real examples.
- Add further export formats only when there is a demonstrated workflow need.

### First-release acceptance criteria

- Pasting text containing NBSP shows its exact location, a distinct placeholder, an explanation of no-break behavior, and access to character detail.
- Repeated findings can be visited individually without losing surrounding text context.
- Ordinary tabs/newlines and joiner presence alone do not produce a blanket suspicious-text label.
- A bidi override is detected before its detail block is loaded; loading metadata does not change diagnostic counts.
- Lone surrogates, private-use values, and noncharacters remain inspectable with accurate labels.
- Filters, empty states, editing, mode switching, and repeated code-point selection remain coherent.
- All primary workflows work with keyboard and touch, including menu dismissal and focus return.
- Supported long inputs do not freeze editing or create unbounded DOM work; stale or unsupported analysis is clearly identified.
- Exports use the current whole input, with previews and explicit feedback for lossy HTML cases.
- No comparison input, automatic cleanup, or normalization mutation is introduced.

## Testing plan

### Unit tests

- code point splitting
- input preservation within the documented textarea boundary
- CRLF, lone CR/LF, Unicode line separators, trailing breaks, and empty-input line counts
- astral code points
- UTF-16 ranges versus code-point indices and columns
- lone surrogates, private-use values, noncharacters, and unassigned fallback labels
- zero-width characters and informational joiners
- bidi controls with search metadata only, with loaded detail, and before metadata readiness
- variation-selector invisibility and placement handling
- ordinary tabs/newlines versus unexpected controls
- no-break spaces and mixed whitespace
- clustered invisible format characters and occurrence ranges
- combining marks without obvious base
- overlapping finding counts and information/check/problem filtering
- string-level copy outputs, JavaScript literal round-trips, and lossy HTML cases
- later increment: NFC/NFD diagnostics without input mutation

### Component and integration tests

- switching between search and inspector
- analysis updates rows
- row selection updates the detail panel
- search queries, active sets, and pending search updates do not override inspector selection
- input editing and clearing reset stale occurrence selection and feedback
- preview/row selection stays linked for repeated code points
- findings reveal context and previous/next navigation visits every occurrence
- no-input, no-findings, and filtered-empty states are distinct
- the `...` menu opens, keyboard navigates, and closes correctly
- outside click, Escape, focus return, and row/filter keyboard navigation
- mobile finding navigation retains context while explicit inspection reveals detail
- export previews and whole-input copy remain correct with filters and stale analysis
- long-input status, rendering bounds, and rejection of outdated asynchronous results

### Manual verification

- paste text from Word, PDF, chat, email, and documentation
- inspect emoji with ZWJ and skin-tone modifiers
- verify ordinary multilingual text is not treated as invalid merely for containing shaping characters
- inspect bidi controls and whitespace-only strings
- verify diagnostic annotations cannot be visually reordered by pasted bidi controls
- inspect long multiline content
- verify copy and export outputs in JavaScript and HTML contexts

## Deferred follow-ups

- Grapheme-first alternative view
- Full emoji and named-sequence interpretation
- Save or share inspector sessions
- Confusable-string analysis
- Compatibility normalization and explicitly requested transformation workflows
- Font fallback diagnostics

Two-string comparison is outside the agreed scope, not a prerequisite or planned increment of this diagnostic tool. Reconsider it only through a separate product decision.
