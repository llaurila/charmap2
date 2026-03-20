import { SEARCH_KIND_ORDER, UNICODE_VERSION } from '../constants/unicode';
const unicodeBasePath = `${import.meta.env.BASE_URL}unicode/${UNICODE_VERSION}`;
let searchIndexPromise = null;
let blockIndexPromise = null;
const blockPromiseCache = new Map();
const decodeSearchRecord = (encoded, payload) => {
    const [cp, name, kindIndex, blockId, scriptId, aliases, keywords, featuredIn] = encoded;
    const kind = SEARCH_KIND_ORDER[kindIndex];
    const block = payload.blocks[blockId];
    const script = payload.scripts[scriptId];
    if (!kind || !block || !script) {
        throw new Error(`Invalid encoded search record for U+${cp.toString(16).toUpperCase()}`);
    }
    return {
        cp,
        name,
        kind,
        block,
        script,
        aliases,
        keywords,
        featuredIn,
    };
};
const fetchJson = async (path) => {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return (await response.json());
};
export const loadSearchIndex = () => {
    searchIndexPromise ??= fetchJson(`${unicodeBasePath}/search-core.json`).then((payload) => payload.records.map((record) => decodeSearchRecord(record, payload)));
    return searchIndexPromise;
};
export const loadBlockIndex = () => {
    blockIndexPromise ??= fetchJson(`${unicodeBasePath}/ranges.json`);
    return blockIndexPromise;
};
export const loadBlockRecords = (file) => {
    const cached = blockPromiseCache.get(file);
    if (cached) {
        return cached;
    }
    const promise = fetchJson(`${unicodeBasePath}/${file}`);
    blockPromiseCache.set(file, promise);
    return promise;
};
export const findBlockForCodePoint = (blocks, cp) => blocks.find((entry) => cp >= entry.start && cp <= entry.end);
export const promoteSearchRecord = (record) => ({
    ...record,
    category: 'Cn',
});
