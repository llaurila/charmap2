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
const getContentLine = (rawLine) => rawLine.split('#', 1)[0]?.trim() ?? '';
const parseTrimmedFields = (line) => line.split(';').map((part) => part.trim());
const addPropertyRange = (propertyLookup, rangeText, propertyLabel) => {
    const { start, end } = parseCodePointRange(rangeText);
    for (let cp = start; cp <= end; cp += 1) {
        const existing = propertyLookup.get(cp) ?? new Set();
        existing.add(propertyLabel);
        propertyLookup.set(cp, existing);
    }
};
const sortPropertyLookup = (propertyLookup) => new Map(Array.from(propertyLookup.entries(), ([cp, values]) => [
    cp,
    Array.from(values.values()).sort(),
]));
export const parseNameAliases = (source) => {
    const aliases = new Map();
    for (const rawLine of source.split(/\r?\n/u)) {
        const line = getContentLine(rawLine);
        if (!line) {
            continue;
        }
        const [cpText, aliasValue, aliasType] = parseTrimmedFields(line);
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
        const line = getContentLine(rawLine);
        if (!line) {
            continue;
        }
        const [rangeText, propertyName] = parseTrimmedFields(line);
        const propertyLabel = propertyName ? propertyLabelMap[propertyName] : undefined;
        if (!rangeText || !propertyLabel) {
            continue;
        }
        addPropertyRange(propertyLookup, rangeText, propertyLabel);
    }
    return sortPropertyLookup(propertyLookup);
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
    const leading = [
        'G',
        'GG',
        'N',
        'D',
        'DD',
        'R',
        'M',
        'B',
        'BB',
        'S',
        'SS',
        'NG',
        'J',
        'JJ',
        'C',
        'K',
        'T',
        'P',
        'H',
    ];
    const vowel = [
        'A',
        'AE',
        'YA',
        'YAE',
        'EO',
        'E',
        'YEO',
        'YE',
        'O',
        'WA',
        'WAE',
        'OE',
        'YO',
        'U',
        'WEO',
        'WE',
        'WI',
        'YU',
        'EU',
        'YI',
        'I',
    ];
    const trailing = [
        '',
        'G',
        'GG',
        'GS',
        'N',
        'NJ',
        'NH',
        'D',
        'L',
        'LG',
        'LM',
        'LB',
        'LS',
        'LT',
        'LP',
        'LH',
        'M',
        'B',
        'BS',
        'S',
        'SS',
        'NG',
        'J',
        'C',
        'K',
        'T',
        'P',
        'H',
    ];
    const leadingIndex = Math.floor(syllableIndex / nCount);
    const vowelIndex = Math.floor((syllableIndex % nCount) / tCount);
    const trailingIndex = syllableIndex % tCount;
    return `HANGUL SYLLABLE ${leading[leadingIndex]}${vowel[vowelIndex]}${trailing[trailingIndex]}`;
};
export const synthesizeRangeName = (label, cp) => {
    if (label === 'Hangul Syllable') {
        return getHangulSyllableName(cp);
    }
    const prefixedName = [
        ['CJK Ideograph', 'CJK UNIFIED IDEOGRAPH'],
        ['CJK Unified Ideograph', 'CJK UNIFIED IDEOGRAPH'],
        ['Tangut Ideograph', 'TANGUT IDEOGRAPH'],
    ].find(([prefix]) => label.startsWith(prefix));
    if (prefixedName) {
        return `${prefixedName[1]}-${formatCodePoint(cp)}`;
    }
    const exactName = new Map([
        ['Nushu Character', 'NUSHU CHARACTER'],
        ['Khitan Small Script Character', 'KHITAN SMALL SCRIPT CHARACTER'],
    ]).get(label);
    if (exactName) {
        return `${exactName}-${formatCodePoint(cp)}`;
    }
    const containedName = [
        ['Private Use', 'Private Use'],
        ['Noncharacter', 'Noncharacter'],
    ].find(([value]) => label.includes(value));
    if (containedName) {
        return containedName[1];
    }
    if (label.includes('Surrogate')) {
        return label.replace(/\s+/gu, ' ').replace(/^\w/u, (match) => match.toUpperCase());
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
const unicodeRangeFirstPattern = /^<(.+), First>$/u;
const unicodeRangeLastPattern = /^<(.+), Last>$/u;
const createRangeRecord = (cp, name, fields) => ({
    cp,
    name,
    category: fields[2] ?? 'Cn',
    decomposition: parseDecomposition(fields[5] ?? ''),
    caseMap: parseCaseMap(fields[12] ?? '', fields[13] ?? '', fields[14] ?? ''),
    legacyName: fields[10] || undefined,
    isoComment: fields[11] || undefined,
});
const expandPendingRange = (records, pendingRange, rangeEnd) => {
    for (let currentCp = pendingRange.start; currentCp <= rangeEnd; currentCp += 1) {
        records.push(createRangeRecord(currentCp, synthesizeRangeName(pendingRange.label, currentCp), pendingRange.fields));
    }
};
const getPendingRangeLabel = (rawName) => {
    const firstLabel = unicodeRangeFirstPattern.exec(rawName)?.[1];
    if (firstLabel) {
        return { firstLabel };
    }
    return {
        lastLabel: unicodeRangeLastPattern.exec(rawName)?.[1],
    };
};
const parseUnicodeDataLine = (records, rawLine, pendingRange) => {
    const line = rawLine.trim();
    if (!line) {
        return pendingRange;
    }
    return parseUnicodeDataContentLine(records, line, pendingRange);
};
const getParsedUnicodeDataLine = (line) => {
    const fields = line.split(';');
    const cp = Number.parseInt(fields[0] ?? '', 16);
    const rawName = fields[1] ?? '';
    const { firstLabel, lastLabel } = getPendingRangeLabel(rawName);
    return {
        cp,
        fields,
        firstLabel,
        lastLabel,
        rawName,
    };
};
const assertMatchingPendingRange = (pendingRange, lastLabel) => {
    if (!pendingRange || pendingRange.label !== lastLabel) {
        throw new Error(`Mismatched UnicodeData range end for '${lastLabel}'.`);
    }
    return pendingRange;
};
const appendStandaloneUnicodeRecord = (records, cp, fields, rawName) => {
    const name = rawName.startsWith('<') ? normalizePlaceholderName(rawName, cp) : rawName;
    records.push(createRangeRecord(cp, name, fields));
};
const parseUnicodeDataContentLine = (records, line, pendingRange) => {
    const parsedLine = getParsedUnicodeDataLine(line);
    if (parsedLine.firstLabel) {
        return {
            start: parsedLine.cp,
            label: parsedLine.firstLabel,
            fields: parsedLine.fields,
        };
    }
    if (!parsedLine.lastLabel) {
        appendStandaloneUnicodeRecord(records, parsedLine.cp, parsedLine.fields, parsedLine.rawName);
        return pendingRange;
    }
    expandPendingRange(records, assertMatchingPendingRange(pendingRange, parsedLine.lastLabel), parsedLine.cp);
    return undefined;
};
const finalizePendingRange = (pendingRange) => {
    if (pendingRange) {
        throw new Error(`Unterminated UnicodeData range '${pendingRange.label}'.`);
    }
    return undefined;
};
export const parseUnicodeData = (source) => {
    const records = [];
    let pendingRange;
    for (const rawLine of source.split(/\r?\n/u)) {
        pendingRange = parseUnicodeDataLine(records, rawLine, pendingRange);
    }
    finalizePendingRange(pendingRange);
    return records;
};
export const isPrivateUse = (cp) => (cp >= 0xe000 && cp <= 0xf8ff) ||
    (cp >= 0xf0000 && cp <= 0xffffd) ||
    (cp >= 0x100000 && cp <= 0x10fffd);
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
const shouldCompactField = (field) => {
    if (field === undefined) {
        return true;
    }
    if (Array.isArray(field)) {
        return field.length === 0;
    }
    return typeof field === 'object' && field !== null && Object.keys(field).length === 0;
};
const compactRecord = (value) => {
    for (const key of Object.keys(value)) {
        if (shouldCompactField(value[key])) {
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
const flagDescriptions = new Map([
    [
        'private-use',
        'A private-use code point reserved for application-specific meaning ' +
            'rather than standardized interchange.',
    ],
    [
        'surrogate',
        'A surrogate code point used in UTF-16 encoding, ' +
            'not a standalone Unicode scalar value.',
    ],
    [
        'noncharacter',
        'A permanently reserved noncharacter code point ' +
            'that is not intended for open interchange.',
    ],
]);
const kindDescriptions = new Map([
    ['control', 'A control character used for text or device control rather than a visible glyph.'],
    ['whitespace', 'A whitespace character that affects spacing, line breaks, or text layout.'],
    [
        'format',
        'An invisible format character that influences shaping, ordering, or segmentation.',
    ],
    [
        'combining',
        'A combining mark that attaches to a preceding base character rather than standing alone.',
    ],
]);
const describeRecord = (record) => {
    const flagDescription = record.flags?.find((flag) => flagDescriptions.has(flag));
    if (flagDescription) {
        return flagDescriptions.get(flagDescription) ?? 'Unknown character description.';
    }
    const kindDescription = kindDescriptions.get(record.kind);
    if (kindDescription) {
        return kindDescription;
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
const getAliases = (parsedRecord, aliasEntries, name) => dedupe([
    parsedRecord.legacyName,
    parsedRecord.isoComment,
    ...aliasEntries.map((entry) => entry.value),
]).filter((value) => value !== name);
const getDescription = (parsedRecord, name, aliases, block, script, ageValue, kind, flags, keywords, hidden, featuredIn) => {
    const override = descriptionOverrides[parsedRecord.cp];
    if (override) {
        return override;
    }
    if (kind === 'glyph' && !hidden) {
        return undefined;
    }
    return describeRecord({
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
    });
};
const buildCharacterRecord = (parsedRecord, context) => {
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
    const aliases = getAliases(parsedRecord, aliasEntries, name);
    const keywords = dedupe([
        ...(searchKeywordOverrides[parsedRecord.cp] ?? []),
        ...getGenericKeywords(kind, flags),
    ]);
    const hidden = isHiddenByDefault(flags) || undefined;
    const description = getDescription(parsedRecord, name, aliases, block, script, ageValue, kind, flags, keywords, hidden, featuredIn);
    return compactRecord({
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
};
export const buildCharacterRecords = (parsedRecords, context) => parsedRecords.map((parsedRecord) => buildCharacterRecord(parsedRecord, context));
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
