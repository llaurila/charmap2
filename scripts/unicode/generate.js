import path from 'node:path';
import { assertVendoredFilesExist, blockOutputDir, buildCharacterRecords, encodeSearchRecord, ensureDirectory, outputDir, parseNameAliases, parseRangeValueFile, parseSelectedProperties, parseUnicodeData, readVendoredFile, resetBlockOutputDirectory, slugify, sortByCodePoint, toSearchRecord, writeCompactJson, } from './shared';
const createBlockEntries = (records) => {
    const blockMap = new Map();
    for (const record of records) {
        const entries = blockMap.get(record.block) ?? [];
        entries.push(record);
        blockMap.set(record.block, entries);
    }
    const slugCounts = new Map();
    return Array.from(blockMap.entries())
        .map(([label, blockRecords]) => {
        const sortedRecords = sortByCodePoint(blockRecords);
        const first = sortedRecords[0];
        const last = sortedRecords.at(-1);
        if (!first || !last) {
            throw new Error(`Cannot build block entry for '${label}'.`);
        }
        const baseSlug = slugify(label);
        const nextCount = (slugCounts.get(baseSlug) ?? 0) + 1;
        slugCounts.set(baseSlug, nextCount);
        const id = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;
        return {
            id,
            label,
            start: first.cp,
            end: last.cp,
            count: sortedRecords.length,
            file: `blocks/${id}.json`,
        };
    })
        .sort((left, right) => left.start - right.start);
};
const createSearchPayload = (records) => {
    const visibleSearchRecords = records.filter((record) => !record.hidden).map(toSearchRecord);
    const blocks = Array.from(new Set(visibleSearchRecords.map((record) => record.block))).sort();
    const scripts = Array.from(new Set(visibleSearchRecords.map((record) => record.script))).sort();
    const blockIds = new Map(blocks.map((label, index) => [label, index]));
    const scriptIds = new Map(scripts.map((label, index) => [label, index]));
    const encodedRecords = visibleSearchRecords.map((record) => {
        const blockId = blockIds.get(record.block);
        const scriptId = scriptIds.get(record.script);
        if (blockId === undefined || scriptId === undefined) {
            throw new Error(`Missing search lookup ids for U+${record.cp.toString(16).toUpperCase()}`);
        }
        return encodeSearchRecord(record, { blockId, scriptId });
    });
    return {
        blocks,
        scripts,
        records: encodedRecords,
    };
};
const run = async () => {
    await assertVendoredFilesExist();
    await ensureDirectory(outputDir);
    await resetBlockOutputDirectory();
    const [unicodeData, aliases, blocks, scripts, ages, properties] = await Promise.all([
        readVendoredFile('UnicodeData.txt'),
        readVendoredFile('NameAliases.txt'),
        readVendoredFile('Blocks.txt'),
        readVendoredFile('Scripts.txt'),
        readVendoredFile('DerivedAge.txt'),
        readVendoredFile('PropList.txt'),
    ]);
    const parsedRecords = parseUnicodeData(unicodeData);
    const characterRecords = sortByCodePoint(buildCharacterRecords(parsedRecords, {
        aliasLookup: parseNameAliases(aliases),
        blockRanges: parseRangeValueFile(blocks),
        scriptRanges: parseRangeValueFile(scripts),
        ageRanges: parseRangeValueFile(ages),
        propertyLookup: parseSelectedProperties(properties),
    }));
    const blockEntries = createBlockEntries(characterRecords);
    const searchPayload = createSearchPayload(characterRecords);
    for (const blockEntry of blockEntries) {
        const blockRecords = characterRecords
            .filter((record) => record.block === blockEntry.label)
            .map((record) => {
            if (record.featuredIn || record.aliases || record.keywords || record.description || record.hidden) {
                return record;
            }
            const { featuredIn, aliases, keywords, description, hidden, ...minimalRecord } = record;
            void featuredIn;
            void aliases;
            void keywords;
            void description;
            void hidden;
            return minimalRecord;
        });
        await writeCompactJson(path.join(outputDir, blockEntry.file), blockRecords);
    }
    await writeCompactJson(path.join(outputDir, 'search-core.json'), searchPayload);
    await writeCompactJson(path.join(outputDir, 'ranges.json'), blockEntries);
    console.log(`Generated ${characterRecords.length} character records across ${blockEntries.length} block files in ${blockOutputDir}.`);
};
run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
