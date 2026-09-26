import { type AcpGraphStatus } from './acp-graph-contract.js';
export declare const NL: string;
/** 诊断用：契约状态 + 最近一次失败原因。 */
export declare function acpGraphDiagnostics(): {
    status: AcpGraphStatus;
    lastProblem: {
        detail: string;
        status: AcpGraphStatus;
    } | null;
};
/**
 * 一行人类可读的状态。刻意区分"没装 handoff"与"装了但读不了"：旧行为是两者都表现为
 * "ingested 0"，用户无从判断该去装插件还是该去查 schema。
 */
export declare function acpGraphStatusLine(): string;
/** 图是否【可读】（契约可读，与数据量无关）。 */
export declare function acpGraphAvailable(): boolean;
export declare function wikiRoot(): string;
export declare function ensureLayers(): void;
/** Ingest an experience trace into raw/ (immutable). */
export declare function ingestExperience(title: string, content: string, meta?: Record<string, unknown>): string;
/** Consolidate a raw trace into a wiki pattern (Wiki Maintainer). */
export declare function consolidatePattern(name: string, title: string, diagnosis: string, workaround: string): string;
/** Append to the evolution log (logs.md). */
export declare function logEvolution(round: string, action: string, detail: string): void;
/** Propose a skill update: write a candidate SKILL.md into skills/ (Skill Proposer). */
/**
 * Write a candidate SKILL.md into skills/. `origin` records WHICH model/session evolved it.
 *
 * WikiSkill (arXiv 2608.27454) found that evolved skills transfer across models and families, and
 * that skills evolved by another model can beat self-evolved ones - which is only actionable if the
 * origin is written down. It is frontmatter, so it costs no context until someone reads the file.
 */
export declare function proposeSkill(name: string, description: string, body: string, fromPatterns?: string[], origin?: string): string;
/** Gate: accept a candidate skill (move to active) or reject (remove). */
export declare function gateSkill(name: string, accept: boolean, score?: number): string;
/** Status of the skill wiki. */
export declare function wikiStatus(): {
    raw: number;
    patterns: number;
    skills: number;
    active: number;
    logs: string[];
};
/**
 * Pull ACP compaction summaries from the ACP graph (~/.dsh/graph/graph.db) as experience source.
 *
 * 读取经【规范化只读契约】（src/acp-graph-contract.ts，由 dsh-acp-graph-contract 同步而来，
 * 顶部带源哈希）。旧实现有两个问题：
 *   1) 它用 `require('node:sqlite')` 取驱动——而本插件是 ESM 打包，`require` 在 ESM 里
 *      根本不存在，于是 ReferenceError 被外层 `catch { return [] }` 吞掉：
 *      这个功能一直是【静默失效】的（永远"ingested 0"）。
 *   2) 无论读失败还是本来就没 checkpoint，都返回 []，与"成功但空"无法区分。
 * 现在：读取在契约保护下，失败是具名的并通过 acpGraphStatusLine() 可解释；
 * 只有【读取】被兜底——写 raw/ 失败必须报出来，不能伪装成"0 个 checkpoint"。
 */
export declare function ingestFromAcp(limit?: number): string[];
