/** ~4 chars per token - the same coarse unit this plugin already uses in its notes. */
export declare function approxTokens(text: string): number;
/** Relative files a SKILL.md points at: markdown links plus bare resource-path mentions. */
export declare function skillRefs(md: string): string[];
export interface BundleAudit {
    name: string;
    rootTokens: number;
    bundleTokens: number;
    refs: string[];
    missingRefs: string[];
    missingDirs: string[];
    dupLines: string[];
    dupTokens: number;
}
/** One skill directory: its root plus every file the root routes to. */
export declare function auditBundle(dir: string, name: string): BundleAudit;
/** Every skill directory under a tree (a dir is a skill when it holds a SKILL.md). */
export declare function auditTree(rootDir: string): BundleAudit[];
/** Read a frontmatter list field (`patterns: a, b` / `patterns: [a, b]`). No regex, on purpose. */
export declare function frontmatterList(text: string, key: string): string[];
export interface WikiAudit {
    funnel: {
        raw: number;
        patterns: number;
        candidates: number;
        active: number;
    };
    patterns: string[];
    orphanPatterns: string[];
    bundles: BundleAudit[];
}
/** The evolution wiki: the funnel, which patterns actually reached a skill, and every bundle. */
export declare function auditWiki(): WikiAudit;
