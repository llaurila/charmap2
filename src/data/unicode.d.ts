import type { BlockIndexEntry, CharacterRecord, SearchRecord } from '../types/unicode';
export declare const loadSearchIndex: () => Promise<SearchRecord[]>;
export declare const loadBlockIndex: () => Promise<BlockIndexEntry[]>;
export declare const loadBlockRecords: (file: string) => Promise<CharacterRecord[]>;
export declare const findBlockForCodePoint: (blocks: BlockIndexEntry[], cp: number) => BlockIndexEntry | undefined;
export declare const promoteSearchRecord: (record: SearchRecord) => CharacterRecord;
