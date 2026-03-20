import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEARCH_KIND_ORDER, UNICODE_VERSION } from '../../src/constants/unicode';
import { descriptionOverrides } from '../../src/data/descriptionOverrides';
import { featuredSetLookup } from '../../src/data/featuredSets';
import { searchKeywordOverrides } from '../../src/data/searchKeywords';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..', '..');
export const vendorDir = path.join(repoRoot, 'vendor', 'unicode', UNICODE_VERSION);
export const outputDir = path.join(repoRoot, 'public', 'unicode', UNICODE_VERSION);
export const blockOutputDir = path.join(outputDir, 'blocks');
export const unicodeBaseUrl = `https://www.unicode.org/Public/${UNICODE_VERSION}/ucd`;
export const vendoredSourceFiles = [
    'UnicodeData.txt',
    'NameAliases.txt',
    'Blocks.txt',
    'Scripts.txt',
    'DerivedAge.txt',
    'PropList.txt',
    'NamesList.txt',
];
const categoryLabels = {
    Cc: 'control character',
    Cf: 'format character',
    Co: 'private-use character',
    Cs: 'surrogate code point',
    Ll: 'lowercase letter',
    Lm: 'modifier letter',
    Lo: 'other letter',
    Lt: 'titlecase letter',
    Lu: 'uppercase letter',
    Mc: 'spacing combining mark',
    Me: 'enclosing mark',
    Mn: 'nonspacing mark',
    Nd: 'decimal digit',
    Nl: 'letter number',
    No: 'other number',
    Pc: 'connector punctuation',
    Pd: 'dash punctuation',
    Pe: 'closing punctuation',
    Pf: 'final quotation punctuation',
    Pi: 'initial quotation punctuation',
    Po: 'other punctuation',
    Ps: 'opening punctuation',
    Sc: 'currency symbol',
    Sk: 'modifier symbol',
    Sm: 'mathematical symbol',
    So: 'other symbol',
    Zl: 'line separator',
    Zp: 'paragraph separator',
    Zs: 'space separator',
};
const propertyLabelMap = {
    White_Space: 'whitespace',
    Bidi_Control: 'bidi control',
    Join_Control: 'join control',
    Dash: 'dash',
    Quotation_Mark: 'quotation mark',
};
const controlAliasPriority = ['control', 'alternate', 'figment', 'abbreviation'];
export const formatCodePoint = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
export const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'block';
export const parseCodePointRange = (value) => {
    const rangeText = value.trim();
    if (rangeText.includes('..')) {
        const [startText, endText] = rangeText.split('..');
        if (!startText || !endText) {
            throw new Error(`Invalid range: ${value}`);
        }
        return {
            start: Number.parseInt(startText, 16),
            end: Number.parseInt(endText, 16),
        };
    }
    const cp = Number.parseInt(rangeText, 16);
    return { start: cp, end: cp };
};
export const parseRangeValueFile = (source) => source
    .split(/\r?\n/u)
    .map((line) => line.split('#', 1)[0]?.trim() ?? '')
    .filter(Boolean)
    .map((line) => {
    const [rangeText, valueText] = line.split(';').map((part) => part.trim());
    if (!rangeText || !valueText) {
        throw new Error(`Invalid range-value line: ${line}`);
    }
    return {
        ...parseCodePointRange(rangeText),
        value: valueText,
    };
});
export const findRangeValue = (ranges, cp, fallback) => {
    let low = 0;
    let high = ranges.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const entry = ranges[mid];
        if (!entry) {
            break;
        }
        if (cp < entry.start) {
            high = mid - 1;
            continue;
        }
        if (cp > entry.end) {
            low = mid + 1;
            continue;
        }
        return entry.value;
    }
    return fallback;
};
export const parseNameAliases = (source) => {
    const aliases = new Map();
    for (const rawLine of source.split(/\r?\n/u)) {
        const line = rawLine.split('#', 1)[0]?.trim() ?? '';
        if (!line) {
            continue;
        }
        const [cpText, aliasValue, aliasType] = line.split(';').map((part) => part.trim());
        if (!cpText || !aliasValue || !aliasType) {
            throw new Error(`Invalid alias line: ${rawLine}`);
        }
        const cp = Number.parseInt(cpText, 16);
        const entries = aliases.get(cp) ?? [];
        entries.push({ value: aliasValue, type: aliasType.toLowerCase() });
        aliases.set(cp, entries);
    }
    return aliases;
};
export const parseSelectedProperties = (source) => {
    const propertyLookup = new Map();
    for (const rawLine of source.split(/\r?\n/u)) {
        const line = rawLine.split('#', 1)[0]?.trim() ?? '';
        if (!line) {
            continue;
        }
        const [rangeText, propertyName] = line.split(';').map((part) => part.trim());
        const propertyLabel = propertyName ? propertyLabelMap[propertyName] : undefined;
        if (!rangeText || !propertyLabel) {
            continue;
        }
        const { start, end } = parseCodePointRange(rangeText);
        for (let cp = start; cp <= end; cp += 1) {
            const existing = propertyLookup.get(cp) ?? new Set();
            existing.add(propertyLabel);
            propertyLookup.set(cp, existing);
        }
    }
    return new Map(Array.from(propertyLookup.entries(), ([cp, values]) => [cp, Array.from(values.values()).sort()]));
};
export const getHangulSyllableName = (cp) => {
    const syllableIndex = cp - 0xac00;
    const lCount = 19;
    const vCount = 21;
    const tCount = 28;
    const nCount = vCount * tCount;
    const sCount = lCount * nCount;
    if (syllableIndex < 0 || syllableIndex >= sCount) {
        throw new Error(`Code point U+${formatCodePoint(cp)} is not a Hangul syllable.`);
    }
    const leading = ['G', 'GG', 'N', 'D', 'DD', 'R', 'M', 'B', 'BB', 'S', 'SS', 'NG', 'J', 'JJ', 'C', 'K', 'T', 'P', 'H'];
    const vowel = ['A', 'AE', 'YA', 'YAE', 'EO', 'E', 'YEO', 'YE', 'O', 'WA', 'WAE', 'OE', 'YO', 'U', 'WEO', 'WE', 'WI', 'YU', 'EU', 'YI', 'I'];
    const trailing = ['', 'G', 'GG', 'GS', 'N', 'NJ', 'NH', 'D', 'L', 'LG', 'LM', 'LB', 'LS', 'LT', 'LP', 'LH', 'M', 'B', 'BS', 'S', 'SS', 'NG', 'J', 'C', 'K', 'T', 'P', 'H'];
    const leadingIndex = Math.floor(syllableIndex / nCount);
    const vowelIndex = Math.floor((syllableIndex % nCount) / tCount);
    const trailingIndex = syllableIndex % tCount;
    return `HANGUL SYLLABLE ${leading[leadingIndex]}${vowel[vowelIndex]}${trailing[trailingIndex]}`;
};
export const synthesizeRangeName = (label, cp) => {
    if (label === 'Hangul Syllable') {
        return getHangulSyllableName(cp);
    }
    if (label.startsWith('CJK Ideograph') || label.startsWith('CJK Unified Ideograph')) {
        return `CJK UNIFIED IDEOGRAPH-${formatCodePoint(cp)}`;
    }
    if (label.startsWith('Tangut Ideograph')) {
        return `TANGUT IDEOGRAPH-${formatCodePoint(cp)}`;
    }
    if (label === 'Nushu Character') {
        return `NUSHU CHARACTER-${formatCodePoint(cp)}`;
    }
    if (label === 'Khitan Small Script Character') {
        return `KHITAN SMALL SCRIPT CHARACTER-${formatCodePoint(cp)}`;
    }
    if (label.includes('Surrogate')) {
        return label
            .replace(/\s+/gu, ' ')
            .replace(/^\w/u, (match) => match.toUpperCase());
    }
    if (label.includes('Private Use')) {
        return 'Private Use';
    }
    if (label.includes('Noncharacter')) {
        return 'Noncharacter';
    }
    throw new Error(`Unhandled range naming rule for '${label}'.`);
};
const parseDecomposition = (value) => {
    if (!value) {
        return undefined;
    }
    const parts = value
        .split(' ')
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => !part.startsWith('<'));
    if (parts.length === 0) {
        return undefined;
    }
    return parts.map((part) => Number.parseInt(part, 16));
};
const parseCaseMap = (upper, lower, title) => {
    const upperValue = upper ? Number.parseInt(upper, 16) : undefined;
    const lowerValue = lower ? Number.parseInt(lower, 16) : undefined;
    const titleValue = title ? Number.parseInt(title, 16) : undefined;
    if (upperValue === undefined && lowerValue === undefined && titleValue === undefined) {
        return undefined;
    }
    return {
        upper: upperValue,
        lower: lowerValue,
        title: titleValue,
    };
};
const normalizePlaceholderName = (value, cp) => {
    if (value === '<control>') {
        return value;
    }
    if (/^<noncharacter-[0-9A-F]+>$/u.test(value)) {
        return 'Noncharacter';
    }
    if (/^<private-use-[0-9A-F]+>$/u.test(value)) {
        return 'Private Use';
    }
    if (/^<surrogate-[0-9A-F]+>$/u.test(value)) {
        return cp <= 0xdbff ? 'Surrogate' : 'Low Surrogate';
    }
    return value.slice(1, -1);
};
export const parseUnicodeData = (source) => {
    const records = [];
    let pendingRange;
    for (const rawLine of source.split(/\r?\n/u)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const fields = line.split(';');
        const cp = Number.parseInt(fields[0] ?? '', 16);
        const rawName = fields[1] ?? '';
        const rangeStartMatch = rawName.match(/^<(.+), First>$/u);
        const rangeEndMatch = rawName.match(/^<(.+), Last>$/u);
        if (rangeStartMatch) {
            pendingRange = {
                start: cp,
                label: rangeStartMatch[1],
                fields,
            };
            continue;
        }
        if (rangeEndMatch) {
            const rangeLabel = rangeEndMatch[1];
            if (!pendingRange || pendingRange.label !== rangeLabel) {
                throw new Error(`Mismatched UnicodeData range end for '${rangeLabel}'.`);
            }
            for (let currentCp = pendingRange.start; currentCp <= cp; currentCp += 1) {
                records.push({
                    cp: currentCp,
                    name: synthesizeRangeName(rangeLabel, currentCp),
                    category: pendingRange.fields[2] ?? 'Cn',
                    decomposition: parseDecomposition(pendingRange.fields[5] ?? ''),
                    caseMap: parseCaseMap(pendingRange.fields[12] ?? '', pendingRange.fields[13] ?? '', pendingRange.fields[14] ?? ''),
                    legacyName: pendingRange.fields[10] || undefined,
                    isoComment: pendingRange.fields[11] || undefined,
                });
            }
            pendingRange = undefined;
            continue;
        }
        records.push({
            cp,
            name: rawName.startsWith('<') ? normalizePlaceholderName(rawName, cp) : rawName,
            category: fields[2] ?? 'Cn',
            decomposition: parseDecomposition(fields[5] ?? ''),
            caseMap: parseCaseMap(fields[12] ?? '', fields[13] ?? '', fields[14] ?? ''),
            legacyName: fields[10] || undefined,
            isoComment: fields[11] || undefined,
        });
    }
    if (pendingRange) {
        throw new Error(`Unterminated UnicodeData range '${pendingRange.label}'.`);
    }
    return records;
};
export const isPrivateUse = (cp) => (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0xffffd) || (cp >= 0x100000 && cp <= 0x10fffd);
export const isNoncharacter = (cp) => (cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe;
export const isSurrogate = (cp) => cp >= 0xd800 && cp <= 0xdfff;
export const classifyKind = (category, flags) => {
    if (category === 'Cc') {
        return 'control';
    }
    if (flags.includes('whitespace')) {
        return 'whitespace';
    }
    if (category === 'Cf') {
        return 'format';
    }
    if (category.startsWith('M')) {
        return 'combining';
    }
    return 'glyph';
};
const compactRecord = (value) => {
    for (const key of Object.keys(value)) {
        const field = value[key];
        if (field === undefined) {
            delete value[key];
            continue;
        }
        if (Array.isArray(field) && field.length === 0) {
            delete value[key];
            continue;
        }
        if (typeof field === 'object' && field && !Array.isArray(field) && Object.keys(field).length === 0) {
            delete value[key];
        }
    }
    return value;
};
const getCategoryLabel = (category) => categoryLabels[category] ?? 'character';
const dedupe = (values) => {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        if (!value) {
            continue;
        }
        if (seen.has(value)) {
            continue;
        }
        seen.add(value);
        result.push(value);
    }
    return result;
};
const getPrimaryControlAlias = (aliases) => {
    for (const type of controlAliasPriority) {
        const match = aliases.find((entry) => entry.type === type);
        if (match) {
            return match.value;
        }
    }
    return undefined;
};
const describeRecord = (record) => {
    if (record.flags?.includes('private-use')) {
        return 'A private-use code point reserved for application-specific meaning rather than standardized interchange.';
    }
    if (record.flags?.includes('surrogate')) {
        return 'A surrogate code point used in UTF-16 encoding, not a standalone Unicode scalar value.';
    }
    if (record.flags?.includes('noncharacter')) {
        return 'A permanently reserved noncharacter code point that is not intended for open interchange.';
    }
    if (record.kind === 'control') {
        return 'A control character used for text or device control rather than a visible glyph.';
    }
    if (record.kind === 'whitespace') {
        return 'A whitespace character that affects spacing, line breaks, or text layout.';
    }
    if (record.kind === 'format') {
        return 'An invisible format character that influences shaping, ordering, or segmentation.';
    }
    if (record.kind === 'combining') {
        return 'A combining mark that attaches to a preceding base character rather than standing alone.';
    }
    return `A ${getCategoryLabel(record.category)} in the ${record.block} block.`;
};
const getFeaturedSetIds = (cp) => Object.entries(featuredSetLookup)
    .filter(([, members]) => members.has(cp))
    .map(([id]) => id);
const getDerivedFlags = (cp, name) => {
    const flags = [];
    if (isPrivateUse(cp)) {
        flags.push('private-use');
    }
    if (isSurrogate(cp)) {
        flags.push('surrogate');
    }
    if (isNoncharacter(cp)) {
        flags.push('noncharacter');
    }
    if (name.startsWith('VARIATION SELECTOR')) {
        flags.push('variation selector');
    }
    return flags;
};
const isHiddenByDefault = (flags) => flags.includes('private-use') || flags.includes('surrogate') || flags.includes('noncharacter');
const getGenericKeywords = (kind, flags) => {
    const keywords = [];
    if (kind === 'control') {
        keywords.push('control');
    }
    if (kind === 'combining') {
        keywords.push('combining mark');
    }
    if (kind === 'format') {
        keywords.push('format', 'invisible');
    }
    if (kind === 'whitespace') {
        keywords.push('whitespace', 'space');
    }
    for (const flag of flags) {
        keywords.push(flag);
    }
    return keywords;
};
export const buildCharacterRecords = (parsedRecords, context) => parsedRecords.map((parsedRecord) => {
    const aliasEntries = context.aliasLookup.get(parsedRecord.cp) ?? [];
    const primaryControlAlias = parsedRecord.name === '<control>' ? getPrimaryControlAlias(aliasEntries) : undefined;
    const derivedFlags = getDerivedFlags(parsedRecord.cp, parsedRecord.name);
    const block = findRangeValue(context.blockRanges, parsedRecord.cp, 'No Block');
    const script = findRangeValue(context.scriptRanges, parsedRecord.cp, 'Unknown');
    const ageValue = findRangeValue(context.ageRanges, parsedRecord.cp, 'Unassigned');
    const propertyFlags = context.propertyLookup.get(parsedRecord.cp) ?? [];
    const flags = dedupe([...propertyFlags, ...derivedFlags]).sort();
    const kind = classifyKind(parsedRecord.category, flags);
    const featuredIn = getFeaturedSetIds(parsedRecord.cp);
    const name = primaryControlAlias ?? parsedRecord.name;
    const aliases = dedupe([
        parsedRecord.legacyName,
        parsedRecord.isoComment,
        ...aliasEntries.map((entry) => entry.value),
    ]).filter((value) => value !== name);
    const keywords = dedupe([
        ...(searchKeywordOverrides[parsedRecord.cp] ?? []),
        ...getGenericKeywords(kind, flags),
    ]);
    const hidden = isHiddenByDefault(flags) || undefined;
    const description = descriptionOverrides[parsedRecord.cp] ??
        (kind !== 'glyph' || hidden
            ? describeRecord({
                cp: parsedRecord.cp,
                name,
                aliases,
                block,
                script,
                category: parsedRecord.category,
                age: ageValue === 'Unassigned' ? undefined : ageValue,
                kind,
                flags,
                keywords,
                hidden,
                decomposition: parsedRecord.decomposition,
                caseMap: parsedRecord.caseMap,
                featuredIn,
            })
            : undefined);
    const record = compactRecord({
        cp: parsedRecord.cp,
        name,
        aliases,
        block,
        script,
        category: parsedRecord.category,
        age: ageValue === 'Unassigned' ? undefined : ageValue,
        description,
        kind,
        flags,
        keywords,
        hidden,
        decomposition: parsedRecord.decomposition,
        caseMap: parsedRecord.caseMap,
        featuredIn,
    });
    return record;
});
export const toSearchRecord = (record) => {
    return compactRecord({
        cp: record.cp,
        name: record.name,
        aliases: record.aliases,
        kind: record.kind,
        block: record.block,
        script: record.script,
        keywords: record.keywords,
        featuredIn: record.featuredIn,
    });
};
export const encodeSearchRecord = (record, ids) => {
    const kindIndex = SEARCH_KIND_ORDER.indexOf(record.kind);
    if (kindIndex === -1) {
        throw new Error(`Unsupported character kind '${record.kind}'.`);
    }
    const encoded = [
        record.cp,
        record.name,
        kindIndex,
        ids.blockId,
        ids.scriptId,
        record.aliases,
        record.keywords,
        record.featuredIn,
    ];
    while (encoded.length > 5 && encoded.at(-1) === undefined) {
        encoded.pop();
    }
    return encoded;
};
export const sortByCodePoint = (items) => [...items].sort((left, right) => left.cp - right.cp);
export const writeCompactJson = async (filePath, value) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
};
export const ensureDirectory = async (directoryPath) => {
    await mkdir(directoryPath, { recursive: true });
};
export const resetBlockOutputDirectory = async () => {
    await rm(blockOutputDir, { recursive: true, force: true });
    await mkdir(blockOutputDir, { recursive: true });
};
export const readVendoredFile = async (fileName) => readFile(path.join(vendorDir, fileName), 'utf8');
export const assertVendoredFilesExist = async () => {
    for (const fileName of vendoredSourceFiles) {
        const filePath = path.join(vendorDir, fileName);
        try {
            await stat(filePath);
        }
        catch {
            throw new Error(`Missing vendored Unicode file '${fileName}'. Run 'npm run vendor:unicode' first.`);
        }
    }
};
