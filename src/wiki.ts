/**
 * dsh-skill-pack — WikiSkill evolution layer (arXiv 2608.27454).
 *
 * Three-layer knowledge architecture under ~/.dsh/skill-wiki/:
 *   raw/       immutable experience traces (dev sessions, failures, wins)
 *   wiki/      compiled knowledge: patterns/<name>.md + logs.md + skill-impact.md
 *   skills/    executable skills (SKILL.md), evolution candidates live here
 *
 * Evolution loop (WikiSkill): ingest experience → consolidate into wiki →
 * propose skill update → gate (accept/reject). Wiki keeps cross-iteration
 * history so rejected interventions aren't re-proposed.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  acpGraphStatus,
  withAcpGraph,
  type AcpGraphStatus,
} from './acp-graph-contract.js';

export const NL = String.fromCharCode(10);

/** 最近一次 ACP 读取失败的原因（供诊断输出）；成功时为 null。 */
let lastAcpProblem: { detail: string; status: AcpGraphStatus } | null = null;

/**
 * 记录失败原因。只有 'no-db' 不打日志：图不存在是预期内的降级（不装 handoff 也能用），
 * 状态由 acpGraphStatusLine() 表达；其余原因都是真故障，必须出声。原因一律进
 * lastAcpProblem，因此诊断永远完整。
 */
function note(detail: string, status: AcpGraphStatus): void {
  lastAcpProblem = { detail, status };
  if (status.reason === 'no-db') return;
  console.warn('[dsh-skill-pack] ACP graph read failed:', detail, `(reason=${status.reason})`);
}

/** 诊断用：契约状态 + 最近一次失败原因。 */
export function acpGraphDiagnostics(): { status: AcpGraphStatus; lastProblem: { detail: string; status: AcpGraphStatus } | null } {
  return { status: acpGraphStatus(), lastProblem: lastAcpProblem };
}

/**
 * 一行人类可读的状态。刻意区分"没装 handoff"与"装了但读不了"：旧行为是两者都表现为
 * "ingested 0"，用户无从判断该去装插件还是该去查 schema。
 */
export function acpGraphStatusLine(): string {
  const s = acpGraphStatus();
  switch (s.reason) {
    case 'ok':
      return `available (contract v${s.contractVersion}, db v${s.stampedVersion})`;
    case 'no-contract':
      return `available (db has no version stamp; shape verified against contract v${s.contractVersion})`;
    case 'no-db':
      return `not available — ${s.path} does not exist (is dsh-session-handoff installed?)`;
    case 'schema-mismatch':
      return `NOT readable — ${s.detail}${s.missing ? ' missing: ' + JSON.stringify(s.missing) : ''}`;
    default:
      return `NOT readable — ${s.detail ?? 'unknown error'}`;
  }
}

/** 图是否【可读】（契约可读，与数据量无关）。 */
export function acpGraphAvailable(): boolean {
  return acpGraphStatus().ok;
}

export function wikiRoot(): string {
  const base = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  return join(base, 'skill-wiki');
}
export function ensureLayers(): void {
  for (const d of ['raw', 'wiki/patterns', 'skills', 'skills-active']) mkdirSync(join(wikiRoot(), d), { recursive: true });
  const logs = join(wikiRoot(), 'wiki', 'logs.md');
  if (!existsSync(logs)) writeFileSync(logs, '# Skill Evolution Log' + NL + NL + '<!-- Wiki Maintainer appends one entry per evolution round -->' + NL, 'utf8');
  const impact = join(wikiRoot(), 'wiki', 'skill-impact.md');
  if (!existsSync(impact)) writeFileSync(impact, '# Skill Impact Tracker' + NL + NL + '<!-- updated programmatically after gating -->' + NL, 'utf8');
}
function ts(): string { return new Date().toISOString(); }
function slug(s: string): string { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled'; }

/** Ingest an experience trace into raw/ (immutable). */
export function ingestExperience(title: string, content: string, meta: Record<string, unknown> = {}): string {
  ensureLayers();
  const file = join(wikiRoot(), 'raw', ts().replace(/[:.]/g, '-') + '-' + slug(title) + '.md');
  const body = '---' + NL + 'title: ' + title + NL + 'time: ' + ts() + NL + 'meta: ' + JSON.stringify(meta) + NL + '---' + NL + NL + content;
  writeFileSync(file, body, 'utf8');
  return file;
}

/** Consolidate a raw trace into a wiki pattern (Wiki Maintainer). */
export function consolidatePattern(name: string, title: string, diagnosis: string, workaround: string): string {
  ensureLayers();
  const file = join(wikiRoot(), 'wiki', 'patterns', slug(name) + '.md');
  const body = '---' + NL + 'name: ' + slug(name) + NL + 'title: ' + title + NL + 'consolidated: ' + ts() + NL + '---' + NL + NL + '## Diagnosis' + NL + NL + diagnosis + NL + NL + '## Workaround' + NL + NL + workaround;
  writeFileSync(file, body, 'utf8');
  return file;
}

/** Append to the evolution log (logs.md). */
export function logEvolution(round: string, action: string, detail: string): void {
  ensureLayers();
  appendFileSync(join(wikiRoot(), 'wiki', 'logs.md'), NL + '- **' + ts() + '** [' + round + '] ' + action + ': ' + detail + NL, 'utf8');
}

/** Propose a skill update: write a candidate SKILL.md into skills/ (Skill Proposer). */
/**
 * Write a candidate SKILL.md into skills/. `origin` records WHICH model/session evolved it.
 *
 * WikiSkill (arXiv 2608.27454) found that evolved skills transfer across models and families, and
 * that skills evolved by another model can beat self-evolved ones - which is only actionable if the
 * origin is written down. It is frontmatter, so it costs no context until someone reads the file.
 */
export function proposeSkill(name: string, description: string, body: string, fromPatterns: string[] = [], origin = ''): string {
  ensureLayers();
  const dir = join(wikiRoot(), 'skills', slug(name));
  mkdirSync(dir, { recursive: true });
  const originLine = String(origin ?? '').trim() ? NL + 'origin: ' + String(origin).trim() : '';
  const sk = '---' + NL + 'name: ' + slug(name) + NL + 'description: ' + description + NL + 'source: wiki-proposed' + originLine + NL + 'patterns: ' + JSON.stringify(fromPatterns) + NL + 'proposed: ' + ts() + NL + '---' + NL + NL + body;
  writeFileSync(join(dir, 'SKILL.md'), sk, 'utf8');
  return join(dir, 'SKILL.md');
}

/** Gate: accept a candidate skill (move to active) or reject (remove). */
export function gateSkill(name: string, accept: boolean, score?: number): string {
  ensureLayers();
  const dir = join(wikiRoot(), 'skills', slug(name));
  const active = join(wikiRoot(), 'skills-active', slug(name));
  if (!existsSync(dir)) return 'skill not found: ' + name;
  if (accept) {
    mkdirSync(active, { recursive: true });
    writeFileSync(join(active, 'SKILL.md'), readFileSync(join(dir, 'SKILL.md'), 'utf8'), 'utf8');
    appendFileSync(join(wikiRoot(), 'wiki', 'skill-impact.md'), NL + '- **' + ts() + '** ACCEPT ' + name + (score != null ? ' score=' + score : '') + NL, 'utf8');
    logEvolution('gate', 'accept', name + (score != null ? ' (score ' + score + ')' : ''));
    return 'accepted: ' + name;
  }
  appendFileSync(join(wikiRoot(), 'wiki', 'skill-impact.md'), NL + '- **' + ts() + '** REJECT ' + name + ' — do not re-propose without new evidence' + NL, 'utf8');
  logEvolution('gate', 'reject', name);
  return 'rejected: ' + name;
}

/** Status of the skill wiki. */
export function wikiStatus(): { raw: number; patterns: number; skills: number; active: number; logs: string[] } {
  ensureLayers();
  const count = (d: string): number => { try { return readdirSync(d).length; } catch { return 0; } };
  const activeDir = join(wikiRoot(), 'skills-active');
  const logs = existsSync(join(wikiRoot(), 'wiki', 'logs.md'))
    ? readFileSync(join(wikiRoot(), 'wiki', 'logs.md'), 'utf8').split(NL).filter((l) => l.trim().startsWith('- **')).slice(-10)
    : [];
  return {
    raw: count(join(wikiRoot(), 'raw')),
    patterns: count(join(wikiRoot(), 'wiki', 'patterns')),
    skills: count(join(wikiRoot(), 'skills')),
    active: existsSync(activeDir) ? readdirSync(activeDir).length : 0,
    logs,
  };
}

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
export function ingestFromAcp(limit = 10): string[] {
  const read = withAcpGraph((db) =>
    db.prepare('SELECT session_id, seq_start, summary, created_at FROM checkpoints ORDER BY created_at DESC LIMIT ?').all(limit) as unknown as {
      session_id: string; seq_start: number; summary: string; created_at: number;
    }[]);
  if (!read.ok) { note(read.detail, read.status); return []; }
  const files: string[] = [];
  for (const r of read.value) {
    files.push(ingestExperience('acp-cp-' + r.session_id + '-' + r.seq_start, r.summary, { source: 'acp_graph', session: r.session_id, seq: r.seq_start }));
  }
  return files;
}
