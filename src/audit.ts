import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NL, wikiRoot, ensureLayers } from './wiki.js';

//
// WikiSkill (arXiv 2608.27454) separates raw experience / accumulated knowledge / executable
// skills, and its ablation says PERSISTENT KNOWLEDGE ACCUMULATION IS CRITICAL. A pattern that no
// skill ever references is knowledge that never reached an executable form - invisible in a plain
// file count, which is why the funnel alone is not an audit.
//
// SkillZip Pro (arXiv 2608.30785): production skills are DIRECTORY BUNDLES with progressive
// loading - the root is always loaded, references only when a branch needs them. So content
// duplicated between root and reference is paid on every activation, and a root pointing at a file
// that does not exist has broken ROUTING: the skill silently loses that branch.

/** ~4 chars per token - the same coarse unit this plugin already uses in its notes. */
export function approxTokens(text: string): number { return Math.ceil(String(text ?? '').length / 4); }

/** Relative files a SKILL.md points at: markdown links plus bare resource-path mentions. */
export function skillRefs(md: string): string[] {
  const out = new Set<string>();
  const text = String(md ?? '');
  const strip = (p: string): string => {
    let s = p.trim();
    while (s.startsWith('./') || s.startsWith('/')) s = s.slice(s.startsWith('./') ? 2 : 1);
    return s;
  };
  const add = (p: string): void => {
    const s0 = strip(p);
    if (s0.includes('*')) return;            // a glob is a pattern, not a path we can check
    const s = s0;
    if (!s || s.includes('://') || s.startsWith('#')) return;
    if (s.includes('.') || s.includes('/')) out.add(s);
  };
  const linkMark = '](';
  let i = text.indexOf(linkMark);
  while (i >= 0) {
    const end = text.indexOf(')', i + 2);
    if (end < 0) break;
    const target = text.slice(i + 2, end).trim().split(' ')[0];
    add(target);
    i = text.indexOf(linkMark, end);
  }
  const dirs = ['resources/', 'references/', 'scripts/', 'assets/', 'subskills/', 'examples/'];
  const stops = ' \t' + String.fromCharCode(10) + '`)\"]}>,;';
  for (const d of dirs) {
    let at = text.indexOf(d);
    while (at >= 0) {
      let j = at;
      while (j < text.length && stops.indexOf(text[j]) < 0) j++;
      // Walk BACK over any ../ prefix. Dropping it made every `../../references/x` resolve inside
      // the skill directory instead of the plugin root, so a shared reference layer that DOES exist
      // was reported as seven broken links - a detector bug that read exactly like a content bug.
      let start = at;
      while (start >= 3 && text.slice(start - 3, start) === '../') start -= 3;
      if (start >= 2 && text.slice(start - 2, start) === './') start -= 2;
      const token = text.slice(start, j).replace(/[.,;:]+$/, '');
      add(token);
      at = text.indexOf(d, j);
    }
  }
  return [...out];
}

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
export function auditBundle(dir: string, name: string): BundleAudit {
  const rootFile = join(dir, 'SKILL.md');
  const root = existsSync(rootFile) ? readFileSync(rootFile, 'utf8') : '';
  const refs = skillRefs(root);
  const missingRefs: string[] = [];
  const missingDirs: string[] = [];
  const dupLines: string[] = [];
  let bundleTokens = approxTokens(root);
  let dupTokens = 0;
  const rootLines = new Set(root.split(NL).map((l) => l.trim()).filter((l) => l.length >= 40));
  for (const ref of refs) {
    const p = join(dir, ref);
    const isFile = ref.includes('.');
    if (!existsSync(p)) {
      // A reference without an extension is a DIRECTORY mention ("see scripts/"), not a broken
      // file link; the first version of this audit counted both and cried wolf 9 times out of 32.
      if (isFile) missingRefs.push(ref); else missingDirs.push(ref);
      continue;
    }
    let body = '';
    try { body = readFileSync(p, 'utf8'); } catch { missingRefs.push(ref); continue; }
    bundleTokens += approxTokens(body);
    for (const l of body.split(NL)) {
      const t = l.trim();
      if (t.length >= 40 && rootLines.has(t) && dupLines.length < 20) { dupLines.push(t.slice(0, 90)); dupTokens += approxTokens(t); }
    }
  }
  return { name, rootTokens: approxTokens(root), bundleTokens, refs, missingRefs, missingDirs, dupLines, dupTokens };
}

/** Every skill directory under a tree (a dir is a skill when it holds a SKILL.md). */
export function auditTree(rootDir: string): BundleAudit[] {
  let names: string[] = [];
  try { names = readdirSync(rootDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
  const out: BundleAudit[] = [];
  for (const n of names) {
    const dir = join(rootDir, n);
    if (existsSync(join(dir, 'SKILL.md'))) out.push(auditBundle(dir, n));
  }
  return out;
}

/** Read a frontmatter list field (`patterns: a, b` / `patterns: [a, b]`). No regex, on purpose. */
export function frontmatterList(text: string, key: string): string[] {
  const out: string[] = [];
  for (const l of String(text ?? '').split(NL)) {
    const t = l.trim();
    if (!t.startsWith(key + ':')) continue;
    let v = t.slice(key.length + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1);
    for (const part of v.split(',')) {
      let q = part.trim();
      if (q.length >= 2 && (q.startsWith(String.fromCharCode(34)) || q.startsWith(String.fromCharCode(39)))) q = q.slice(1, -1);
      if (q) out.push(q);
    }
  }
  return out;
}

export interface CandidateInfo { name: string; origin: string; patterns: string[] }

export interface WikiAudit {
  funnel: { raw: number; patterns: number; candidates: number; active: number };
  patterns: string[];
  orphanPatterns: string[];
  candidates: CandidateInfo[];
  bundles: BundleAudit[];
}

/** The evolution wiki: the funnel, which patterns actually reached a skill, and every bundle. */
export function auditWiki(): WikiAudit {
  ensureLayers();
  const patternsDir = join(wikiRoot(), 'wiki', 'patterns');
  let files: string[] = [];
  try { files = readdirSync(patternsDir).filter((f) => f.endsWith('.md')); } catch { files = []; }
  const patterns = files.map((f) => f.replace('.md', ''));
  const referenced = new Set<string>();
  for (const layer of ['skills', 'skills-active']) {
    for (const b of auditTree(join(wikiRoot(), layer))) {
      const sk = readFileSync(join(wikiRoot(), layer, b.name, 'SKILL.md'), 'utf8');
      for (const p of frontmatterList(sk, 'patterns')) referenced.add(p.replace('.md', ''));
    }
  }
  const count = (d: string): number => { try { return readdirSync(join(wikiRoot(), d)).length; } catch { return 0; } };
  return {
    funnel: { raw: count('raw'), patterns: patterns.length, candidates: count('skills'), active: count('skills-active') },
    patterns,
    orphanPatterns: patterns.filter((p) => !referenced.has(p)),
    candidates: auditTree(join(wikiRoot(), 'skills')).map((b) => {
      const sk = readFileSync(join(wikiRoot(), 'skills', b.name, 'SKILL.md'), 'utf8');
      return { name: b.name, origin: frontmatterList(sk, 'origin')[0] ?? '', patterns: frontmatterList(sk, 'patterns') };
    }),
    bundles: [...auditTree(join(wikiRoot(), 'skills')), ...auditTree(join(wikiRoot(), 'skills-active'))],
  };
}
