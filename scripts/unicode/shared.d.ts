import type { CharacterKind, CharacterRecord, EncodedSearchRecord, SearchRecord } from '../../src/types/unicode';
export type AliasEntry = {
    value: string;
    type: string;
};
export type RangeValue = {
    start: number;
    end: number;
    value: string;
};
export type ParsedUnicodeRecord = {
    cp: number;
    name: string;
    category: string;
    decomposition?: number[];
    caseMap?: {
        upper?: number;
        lower?: number;
        title?: number;
    };
    legacyName?: string;
    isoComment?: string;
};
type BuildContext = {
    aliasLookup: Map<number, AliasEntry[]>;
    blockRanges: RangeValue[];
    scriptRanges: RangeValue[];
    ageRanges: RangeValue[];
    propertyLookup: Map<number, string[]>;
};
export declare const repoRoot: string;
export declare const vendorDir: string;
export declare const outputDir: string;
export declare const blockOutputDir: string;
export declare const unicodeBaseUrl = "https://www.unicode.org/Public/17.0.0/ucd";
export declare const vendoredSourceFiles: readonly ["UnicodeData.txt", "NameAliases.txt", "Blocks.txt", "Scripts.txt", "DerivedAge.txt", "PropList.txt", "NamesList.txt"];
export declare const formatCodePoint: (cp: number) => string;
export declare const slugify: (value: string) => string;
export declare const parseCodePointRange: (value: string) => {
    start: number;
    end: number;
};
export declare const parseRangeValueFile: (source: string) => RangeValue[];
export declare const findRangeValue: (ranges: RangeValue[], cp: number, fallback: string) => string;
export declare const parseNameAliases: (source: string) => Map<number, AliasEntry[]>;
export declare const parseSelectedProperties: (source: string) => Map<number, string[]>;
export declare const getHangulSyllableName: (cp: number) => string;
export declare const synthesizeRangeName: (label: string, cp: number) => string;
export declare const parseUnicodeData: (source: string) => ParsedUnicodeRecord[];
export declare const isPrivateUse: (cp: number) => boolean;
export declare const isNoncharacter: (cp: number) => boolean;
export declare const isSurrogate: (cp: number) => boolean;
export declare const classifyKind: (category: string, flags: string[]) => CharacterKind;
export declare const buildCharacterRecords: (parsedRecords: ParsedUnicodeRecord[], context: BuildContext) => CharacterRecord[];
export declare const toSearchRecord: (record: CharacterRecord) => SearchRecord;
export declare const encodeSearchRecord: (record: SearchRecord, ids: {
    blockId: number;
    scriptId: number;
}) => EncodedSearchRecord;
export declare const sortByCodePoint: <T extends {
    cp: number;
}>(items: T[]) => T[];
export declare const writeCompactJson: (filePath: string, value: unknown) => Promise<void>;
export declare const ensureDirectory: (directoryPath: string) => Promise<void>;
export declare const resetBlockOutputDirectory: () => Promise<void>;
export declare const readVendoredFile: (fileName: string) => Promise<string>;
export declare const assertVendoredFilesExist: () => Promise<void>;
export {};
