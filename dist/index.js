// src/index.ts
import { fileURLToPath } from "node:url";
import { readdirSync as readdirSync3 } from "node:fs";
import { apply as applyFilesystemProvider } from "@deepseek-ai/dsh-skill-filesystem";

// src/wiki.ts
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync as existsSync2, appendFileSync } from "node:fs";
import { join as join2 } from "node:path";
import { homedir as homedir2 } from "node:os";

// src/acp-graph-contract.ts
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
var ACP_GRAPH_CONTRACT_VERSION = 1;
var ACP_GRAPH_V1_REQUIRED = {
  checkpoints: ["session_id", "seq_start", "seq_end", "summary", "created_at"],
  checkpoint_nodes: ["session_id", "seq_start", "node_id"],
  nodes: ["id", "kind", "title", "mention_count"],
  cp_fts: ["session_id", "seq_start", "summary"],
  node_fts: ["id", "title", "kind"],
  docs: ["id", "kind", "title", "body", "source", "indexed_at"],
  doc_fts: ["id", "kind", "title", "body"]
};
function acpGraphPath() {
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "graph", "graph.db");
}
function tableColumns(db, table) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}
function acpGraphStatus() {
  const path = acpGraphPath();
  const base = { path, contractVersion: ACP_GRAPH_CONTRACT_VERSION };
  if (!existsSync(path)) {
    return { ...base, ok: false, stampedVersion: 0, stamped: false, reason: "no-db", detail: `graph.db not found at ${path}` };
  }
  let db = null;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    const stampedVersion = Number(
      db.prepare("PRAGMA user_version").get()?.user_version ?? 0
    );
    if (stampedVersion > ACP_GRAPH_CONTRACT_VERSION) {
      return {
        ...base,
        ok: false,
        stampedVersion,
        stamped: true,
        reason: "schema-mismatch",
        detail: `graph.db is stamped v${stampedVersion} but this reader implements v${ACP_GRAPH_CONTRACT_VERSION}; upgrade the reader`
      };
    }
    const missing = {};
    for (const [table, cols] of Object.entries(ACP_GRAPH_V1_REQUIRED)) {
      const have = tableColumns(db, table);
      if (have.length === 0) {
        missing[table] = [...cols];
        continue;
      }
      const lack = cols.filter((c) => !have.includes(c));
      if (lack.length) missing[table] = lack;
    }
    if (Object.keys(missing).length) {
      return {
        ...base,
        ok: false,
        stampedVersion,
        stamped: stampedVersion > 0,
        reason: "schema-mismatch",
        detail: "graph.db shape does not satisfy contract v1",
        missing
      };
    }
    if (stampedVersion === 0) {
      return {
        ...base,
        ok: true,
        stampedVersion,
        stamped: false,
        reason: "no-contract",
        detail: "graph.db has no user_version stamp (created before the contract); shape verified against v1"
      };
    }
    return { ...base, ok: true, stampedVersion, stamped: true, reason: "ok" };
  } catch (e) {
    return {
      ...base,
      ok: false,
      stampedVersion: 0,
      stamped: false,
      reason: "error",
      detail: e instanceof Error ? e.message : String(e)
    };
  } finally {
    try {
      db?.close();
    } catch {
    }
  }
}
function withAcpGraph(fn) {
  const status = acpGraphStatus();
  if (!status.ok) {
    return {
      ok: false,
      reason: status.reason === "ok" ? "error" : status.reason,
      detail: status.detail ?? status.reason,
      status
    };
  }
  let db = null;
  try {
    db = new DatabaseSync(status.path, { readOnly: true });
    return { ok: true, value: fn(db, status), status };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      detail: e instanceof Error ? e.message : String(e),
      status
    };
  } finally {
    try {
      db?.close();
    } catch {
    }
  }
}

// src/wiki.ts
var NL = String.fromCharCode(10);
var lastAcpProblem = null;
function note(detail, status) {
  lastAcpProblem = { detail, status };
  if (status.reason === "no-db") return;
  console.warn("[dsh-skill-pack] ACP graph read failed:", detail, `(reason=${status.reason})`);
}
function acpGraphStatusLine() {
  const s = acpGraphStatus();
  switch (s.reason) {
    case "ok":
      return `available (contract v${s.contractVersion}, db v${s.stampedVersion})`;
    case "no-contract":
      return `available (db has no version stamp; shape verified against contract v${s.contractVersion})`;
    case "no-db":
      return `not available \u2014 ${s.path} does not exist (is dsh-session-handoff installed?)`;
    case "schema-mismatch":
      return `NOT readable \u2014 ${s.detail}${s.missing ? " missing: " + JSON.stringify(s.missing) : ""}`;
    default:
      return `NOT readable \u2014 ${s.detail ?? "unknown error"}`;
  }
}
function wikiRoot() {
  const base = process.env.DSH_HOME ?? join2(homedir2(), ".dsh");
  return join2(base, "skill-wiki");
}
function ensureLayers() {
  for (const d of ["raw", "wiki/patterns", "skills", "skills-active"]) mkdirSync(join2(wikiRoot(), d), { recursive: true });
  const logs = join2(wikiRoot(), "wiki", "logs.md");
  if (!existsSync2(logs)) writeFileSync(logs, "# Skill Evolution Log" + NL + NL + "<!-- Wiki Maintainer appends one entry per evolution round -->" + NL, "utf8");
  const impact = join2(wikiRoot(), "wiki", "skill-impact.md");
  if (!existsSync2(impact)) writeFileSync(impact, "# Skill Impact Tracker" + NL + NL + "<!-- updated programmatically after gating -->" + NL, "utf8");
}
function ts() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled";
}
function ingestExperience(title, content, meta = {}) {
  ensureLayers();
  const file = join2(wikiRoot(), "raw", ts().replace(/[:.]/g, "-") + "-" + slug(title) + ".md");
  const body = "---" + NL + "title: " + title + NL + "time: " + ts() + NL + "meta: " + JSON.stringify(meta) + NL + "---" + NL + NL + content;
  writeFileSync(file, body, "utf8");
  return file;
}
function consolidatePattern(name2, title, diagnosis, workaround) {
  ensureLayers();
  const file = join2(wikiRoot(), "wiki", "patterns", slug(name2) + ".md");
  const body = "---" + NL + "name: " + slug(name2) + NL + "title: " + title + NL + "consolidated: " + ts() + NL + "---" + NL + NL + "## Diagnosis" + NL + NL + diagnosis + NL + NL + "## Workaround" + NL + NL + workaround;
  writeFileSync(file, body, "utf8");
  return file;
}
function logEvolution(round, action, detail) {
  ensureLayers();
  appendFileSync(join2(wikiRoot(), "wiki", "logs.md"), NL + "- **" + ts() + "** [" + round + "] " + action + ": " + detail + NL, "utf8");
}
function proposeSkill(name2, description, body, fromPatterns = [], origin = "") {
  ensureLayers();
  const dir = join2(wikiRoot(), "skills", slug(name2));
  mkdirSync(dir, { recursive: true });
  const originLine = String(origin ?? "").trim() ? NL + "origin: " + String(origin).trim() : "";
  const sk = "---" + NL + "name: " + slug(name2) + NL + "description: " + description + NL + "source: wiki-proposed" + originLine + NL + "patterns: " + JSON.stringify(fromPatterns) + NL + "proposed: " + ts() + NL + "---" + NL + NL + body;
  writeFileSync(join2(dir, "SKILL.md"), sk, "utf8");
  return join2(dir, "SKILL.md");
}
function gateSkill(name2, accept, score) {
  ensureLayers();
  const dir = join2(wikiRoot(), "skills", slug(name2));
  const active = join2(wikiRoot(), "skills-active", slug(name2));
  if (!existsSync2(dir)) return "skill not found: " + name2;
  if (accept) {
    mkdirSync(active, { recursive: true });
    writeFileSync(join2(active, "SKILL.md"), readFileSync(join2(dir, "SKILL.md"), "utf8"), "utf8");
    appendFileSync(join2(wikiRoot(), "wiki", "skill-impact.md"), NL + "- **" + ts() + "** ACCEPT " + name2 + (score != null ? " score=" + score : "") + NL, "utf8");
    logEvolution("gate", "accept", name2 + (score != null ? " (score " + score + ")" : ""));
    return "accepted: " + name2;
  }
  appendFileSync(join2(wikiRoot(), "wiki", "skill-impact.md"), NL + "- **" + ts() + "** REJECT " + name2 + " \u2014 do not re-propose without new evidence" + NL, "utf8");
  logEvolution("gate", "reject", name2);
  return "rejected: " + name2;
}
function wikiStatus() {
  ensureLayers();
  const count = (d) => {
    try {
      return readdirSync(d).length;
    } catch {
      return 0;
    }
  };
  const activeDir = join2(wikiRoot(), "skills-active");
  const logs = existsSync2(join2(wikiRoot(), "wiki", "logs.md")) ? readFileSync(join2(wikiRoot(), "wiki", "logs.md"), "utf8").split(NL).filter((l) => l.trim().startsWith("- **")).slice(-10) : [];
  return {
    raw: count(join2(wikiRoot(), "raw")),
    patterns: count(join2(wikiRoot(), "wiki", "patterns")),
    skills: count(join2(wikiRoot(), "skills")),
    active: existsSync2(activeDir) ? readdirSync(activeDir).length : 0,
    logs
  };
}
function ingestFromAcp(limit = 10) {
  const read = withAcpGraph((db) => db.prepare("SELECT session_id, seq_start, summary, created_at FROM checkpoints ORDER BY created_at DESC LIMIT ?").all(limit));
  if (!read.ok) {
    note(read.detail, read.status);
    return [];
  }
  const files = [];
  for (const r of read.value) {
    files.push(ingestExperience("acp-cp-" + r.session_id + "-" + r.seq_start, r.summary, { source: "acp_graph", session: r.session_id, seq: r.seq_start }));
  }
  return files;
}

// src/audit.ts
import { readFileSync as readFileSync2, existsSync as existsSync3, readdirSync as readdirSync2 } from "node:fs";
import { join as join3 } from "node:path";
function approxTokens(text) {
  return Math.ceil(String(text ?? "").length / 4);
}
function skillRefs(md) {
  const out = /* @__PURE__ */ new Set();
  const text = String(md ?? "");
  const strip = (p) => {
    let s = p.trim();
    while (s.startsWith("./") || s.startsWith("/")) s = s.slice(s.startsWith("./") ? 2 : 1);
    return s;
  };
  const add = (p) => {
    const s0 = strip(p);
    if (s0.includes("*")) return;
    const s = s0;
    if (!s || s.includes("://") || s.startsWith("#")) return;
    if (s.includes(".") || s.includes("/")) out.add(s);
  };
  const linkMark = "](";
  let i = text.indexOf(linkMark);
  while (i >= 0) {
    const end = text.indexOf(")", i + 2);
    if (end < 0) break;
    const target = text.slice(i + 2, end).trim().split(" ")[0];
    add(target);
    i = text.indexOf(linkMark, end);
  }
  const dirs = ["resources/", "references/", "scripts/", "assets/", "subskills/", "examples/"];
  const stops = " 	" + String.fromCharCode(10) + '`)"]}>,;';
  for (const d of dirs) {
    let at = text.indexOf(d);
    while (at >= 0) {
      let j = at;
      while (j < text.length && stops.indexOf(text[j]) < 0) j++;
      let start = at;
      while (start >= 3 && text.slice(start - 3, start) === "../") start -= 3;
      if (start >= 2 && text.slice(start - 2, start) === "./") start -= 2;
      let tokStart = start;
      while (tokStart > 0 && stops.indexOf(text[tokStart - 1]) < 0) tokStart--;
      const tokenText = text.slice(tokStart, start);
      const isAbsolute = tokenText.includes("/") || tokenText.startsWith("~");
      if (isAbsolute) {
        at = text.indexOf(d, j);
        continue;
      }
      const token = text.slice(start, j).replace(/[.,;:]+$/, "");
      add(token);
      at = text.indexOf(d, j);
    }
  }
  return [...out];
}
function auditBundle(dir, name2) {
  const rootFile = join3(dir, "SKILL.md");
  const root = existsSync3(rootFile) ? readFileSync2(rootFile, "utf8") : "";
  const refs = skillRefs(root);
  const missingRefs = [];
  const missingDirs = [];
  const dupLines = [];
  let bundleTokens = approxTokens(root);
  let dupTokens = 0;
  const rootLines = new Set(root.split(NL).map((l) => l.trim()).filter((l) => l.length >= 40));
  for (const ref of refs) {
    const p = join3(dir, ref);
    const isFile = ref.includes(".");
    if (!existsSync3(p)) {
      if (isFile) missingRefs.push(ref);
      else missingDirs.push(ref);
      continue;
    }
    let body = "";
    try {
      body = readFileSync2(p, "utf8");
    } catch {
      missingRefs.push(ref);
      continue;
    }
    bundleTokens += approxTokens(body);
    for (const l of body.split(NL)) {
      const t = l.trim();
      if (t.length >= 40 && rootLines.has(t) && dupLines.length < 20) {
        dupLines.push(t.slice(0, 90));
        dupTokens += approxTokens(t);
      }
    }
  }
  return { name: name2, rootTokens: approxTokens(root), bundleTokens, refs, missingRefs, missingDirs, dupLines, dupTokens };
}
function auditTree(rootDir) {
  let names = [];
  try {
    names = readdirSync2(rootDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    const dir = join3(rootDir, n);
    if (existsSync3(join3(dir, "SKILL.md"))) out.push(auditBundle(dir, n));
  }
  return out;
}
function frontmatterList(text, key) {
  const out = [];
  for (const l of String(text ?? "").split(NL)) {
    const t = l.trim();
    if (!t.startsWith(key + ":")) continue;
    let v = t.slice(key.length + 1).trim();
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
    for (const part of v.split(",")) {
      let q = part.trim();
      if (q.length >= 2 && (q.startsWith(String.fromCharCode(34)) || q.startsWith(String.fromCharCode(39)))) q = q.slice(1, -1);
      if (q) out.push(q);
    }
  }
  return out;
}
function auditWiki() {
  ensureLayers();
  const patternsDir = join3(wikiRoot(), "wiki", "patterns");
  let files = [];
  try {
    files = readdirSync2(patternsDir).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }
  const patterns = files.map((f) => f.replace(".md", ""));
  const referenced = /* @__PURE__ */ new Set();
  for (const layer of ["skills", "skills-active"]) {
    for (const b of auditTree(join3(wikiRoot(), layer))) {
      const sk = readFileSync2(join3(wikiRoot(), layer, b.name, "SKILL.md"), "utf8");
      for (const p of frontmatterList(sk, "patterns")) referenced.add(p.replace(".md", ""));
    }
  }
  const count = (d) => {
    try {
      return readdirSync2(join3(wikiRoot(), d)).length;
    } catch {
      return 0;
    }
  };
  return {
    funnel: { raw: count("raw"), patterns: patterns.length, candidates: count("skills"), active: count("skills-active") },
    patterns,
    orphanPatterns: patterns.filter((p) => !referenced.has(p)),
    candidates: auditTree(join3(wikiRoot(), "skills")).map((b) => {
      const sk = readFileSync2(join3(wikiRoot(), "skills", b.name, "SKILL.md"), "utf8");
      return { name: b.name, origin: frontmatterList(sk, "origin")[0] ?? "", patterns: frontmatterList(sk, "patterns") };
    }),
    bundles: [...auditTree(join3(wikiRoot(), "skills")), ...auditTree(join3(wikiRoot(), "skills-active"))]
  };
}

// src/index.ts
var skillsRoot = fileURLToPath(new URL("../skills/", import.meta.url));
var name = "skill-pack";
var inject = ["tools", "skills"];
function apply(ctx) {
  applyFilesystemProvider(ctx, {
    providerName: "skill-pack",
    includeDefaultRoots: false,
    bundledSkillDir: skillsRoot,
    watch: false
  });
  const textOut = { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: String(v) }] };
  const reg = (t) => {
    try {
      ctx.tools.register(t);
    } catch (e) {
      console.error("[skill-pack] " + t.name + " skipped: " + e);
    }
  };
  reg({
    name: "skillwiki_status",
    description: "WikiSkill status: raw/ experience traces, wiki patterns, candidate skills, active skills, recent evolution log.",
    // Explicit empty-object schema. A bare `{}` serializes without `type`, which the
    // provider rejects for the WHOLE run: "Invalid schema for function
    // 'skillwiki_status': schema must be a JSON Schema of 'type: \"object\"', got
    // 'type: null'". A parameterless tool still needs a typed object schema.
    parameters: { type: "object", properties: {}, required: [] },
    output: textOut,
    execute: () => {
      const s = wikiStatus();
      return "Skill Wiki (~/.dsh/skill-wiki):\n  raw=" + s.raw + " patterns=" + s.patterns + " candidates=" + s.skills + " active=" + s.active + "\n\nrecent log:\n" + (s.logs.length ? s.logs.join("\n") : "(empty)");
    }
  });
  reg({
    name: "skillwiki_audit",
    description: "Audit the skill wiki AND its bundles, for the two claims two papers make measurable. WikiSkill (arXiv 2608.27454) shows persistent knowledge accumulation is critical - so a pattern no skill references is knowledge that never became executable, and this reports those ORPHANS. SkillZip Pro (arXiv 2608.30785) notes a skill is a directory bundle with progressive loading - so it also reports each bundle token cost, content DUPLICATED between the root and its references (paid on every activation), and references that point at files which do not exist (broken routing: the skill silently loses a branch). Pass catalog to also audit a shipped skills directory.",
    parameters: {
      type: "object",
      properties: {
        catalog: { type: "string", description: "optional extra directory of skill bundles to audit (e.g. a plugin skills/ dir)" }
      },
      required: []
    },
    output: textOut,
    execute: (args) => {
      const a = auditWiki();
      const L = [];
      L.push("Skill wiki audit (~/.dsh/skill-wiki)");
      L.push("  funnel: raw=" + a.funnel.raw + " patterns=" + a.funnel.patterns + " candidates=" + a.funnel.candidates + " active=" + a.funnel.active);
      if (a.candidates.length > 0) {
        L.push("  candidates: " + a.candidates.length);
        for (const c of a.candidates) {
          L.push("    - " + c.name + (c.origin ? " (origin: " + c.origin + ")" : " (origin not recorded)") + " \u2190 " + (c.patterns.join(", ") || "no patterns"));
        }
      }
      L.push(a.orphanPatterns.length === 0 ? "  ORPHANS: none - every pattern is referenced by a skill" : "  ORPHANS (" + a.orphanPatterns.length + "): " + a.orphanPatterns.join(", ") + "  <- knowledge that never reached a skill");
      const fmt = (bs, label) => {
        if (bs.length === 0) return;
        const bad = bs.filter((b) => b.missingRefs.length > 0 || b.missingDirs.length > 0);
        const dup = bs.filter((b) => b.dupTokens > 0);
        L.push("  " + label + ": " + bs.length + " bundles, " + bad.length + " with missing refs, " + dup.length + " with root/reference duplication");
        for (const b of bs) {
          if (b.missingRefs.length === 0 && b.missingDirs.length === 0 && b.dupTokens === 0) continue;
          L.push("    - " + b.name + ": root " + b.rootTokens + " tok / bundle " + b.bundleTokens + " tok / refs " + b.refs.length + (b.missingRefs.length ? " / MISSING FILE: " + b.missingRefs.slice(0, 3).join(", ") : "") + (b.missingDirs.length ? " / dir-not-present: " + b.missingDirs.slice(0, 3).join(", ") : "") + (b.dupTokens ? " / dup " + b.dupLines.length + " line(s) ~" + b.dupTokens + " tok" : ""));
        }
      };
      fmt(a.bundles, "evolution wiki");
      const cat = String(args?.catalog ?? "").trim();
      if (cat) {
        const b2 = auditTree(cat);
        const totalTok = b2.reduce((n, b) => n + b.bundleTokens, 0);
        const rootTok = b2.reduce((n, b) => n + b.rootTokens, 0);
        L.push("  catalog " + cat + ": " + b2.length + " bundles, " + rootTok + " root tok / " + totalTok + " bundle tok (~" + Math.round(rootTok / Math.max(1, totalTok) * 100) + "% always-loaded)");
        fmt(b2, "catalog detail");
      }
      return L.join(String.fromCharCode(10));
    }
  });
  reg({
    name: "skillwiki_ingest",
    description: "Ingest a development experience trace into raw/ (immutable). Use after a debugging/refactor session so the insight becomes skill-evolution material. Optional: from=acp pulls latest ACP compaction summaries as experience.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        from: { type: "string" },
        limit: { type: "number" }
      },
      required: []
    },
    output: textOut,
    execute: (args) => {
      if (args?.from === "acp") {
        const files = ingestFromAcp(Number(args?.limit) || 10);
        const why = files.length ? "" : "\nACP graph: " + acpGraphStatusLine();
        return "ingested " + files.length + " ACP checkpoint(s) into raw/" + why;
      }
      if (!args?.title || !args?.content) throw new Error("title and content required");
      const f = ingestExperience(String(args.title), String(args.content));
      logEvolution("ingest", "experience", String(args.title));
      return "ingested experience \u2192 " + f;
    }
  });
  reg({
    name: "skillwiki_consolidate",
    description: "Wiki Maintainer: consolidate an experience pattern into wiki/patterns/. Extracts a reusable failure-mode/strategy with actionable workaround.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        diagnosis: { type: "string" },
        workaround: { type: "string" }
      },
      required: []
    },
    output: textOut,
    execute: (args) => {
      const f = consolidatePattern(String(args.name), String(args.title), String(args.diagnosis), String(args.workaround));
      logEvolution("consolidate", "pattern", String(args.name));
      return "consolidated pattern \u2192 " + f;
    }
  });
  reg({
    name: "skillwiki_propose",
    description: "Skill Proposer: write a candidate SKILL.md (wiki-informed) into skills/. Generates an atomic skill creation/update proposal grounded in wiki patterns.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        body: { type: "string" },
        origin: { type: "string" },
        patterns: { type: "array", items: { type: "string" } }
      },
      required: []
    },
    output: textOut,
    execute: (args) => {
      const f = proposeSkill(String(args.name), String(args.description), String(args.body), (args?.patterns ?? []).map(String), String(args?.origin ?? ""));
      logEvolution("propose", "skill", String(args.name));
      return "proposed skill \u2192 " + f;
    }
  });
  reg({
    name: "skillwiki_gate",
    description: "Gating: accept or reject a candidate skill. Accepted skills move to skills-active/ (mounted), rejected ones are logged so they are not re-proposed without new evidence.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        accept: { type: "boolean" },
        score: { type: "number" }
      },
      required: []
    },
    output: textOut,
    execute: (args) => gateSkill(String(args.name), args?.accept === true, args?.score != null ? Number(args.score) : void 0)
  });
  ctx.inject?.(["webServer"], (webCtx) => {
    const rejected = createRequestFence(ctx);
    const register = () => webCtx.webServer.register({
      kind: "exact",
      path: "/api/skill-pack/health",
      handler: async (req, res) => {
        if (rejected(req, res)) return;
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("allow", "GET");
          res.end();
          return;
        }
        let skills = 0;
        try {
          skills = readdirSync3(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
        } catch {
        }
        const body = JSON.stringify({ ok: true, plugin: name, skills });
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(body);
      }
    });
    if (typeof webCtx.effect === "function") webCtx.effect(register, `skill-pack: GET /api/skill-pack/health`);
    else register();
  });
}
function createRequestFence(ctx) {
  const resolveConnection = () => {
    const read = ctx?.get;
    if (typeof read !== "function") return void 0;
    try {
      const connection = read.call(ctx, "connection");
      return typeof connection?.requestRejection === "function" ? connection : void 0;
    } catch {
      return void 0;
    }
  };
  return (req, res) => {
    const connection = resolveConnection();
    if (connection === void 0) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "connection service unavailable: the Host/Origin fence cannot be applied" }));
      return true;
    }
    const rejection = connection.requestRejection(req);
    if (rejection === void 0) return false;
    res.statusCode = rejection;
    res.end();
    return true;
  };
}
export {
  apply,
  inject,
  name
};
