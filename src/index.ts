/**
 * dsh-skill-pack — curated engineering skills for DeepSeek Harness.
 *
 * Cross-platform by construction: pure text skills (SKILL.md) mounted via
 * the host's filesystem provider; no platform-specific code, no runtime
 * dependencies beyond the DSH-hosted @deepseek-ai/dsh-skill-filesystem.
 *
 * WikiSkill evolution (arXiv 2608.27454): skills co-evolve with a persistent
 * wiki (~/.dsh/skill-wiki/). raw/ holds immutable experience traces, wiki/
 * holds patterns + evolution logs, skills/ holds candidates. Tools:
 *   skillwiki_status / ingest / consolidate / propose / gate
 * Experience becomes skill: ingest a dev session → consolidate a pattern →
 * propose a skill update → gate it.
 */
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'
import { apply as applyFilesystemProvider } from '@deepseek-ai/dsh-skill-filesystem'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  ingestExperience, consolidatePattern, logEvolution, proposeSkill, gateSkill, wikiStatus, ingestFromAcp, acpGraphStatusLine,
} from './wiki.js'
import { auditWiki, auditTree, approxTokens } from './audit.js'

const skillsRoot = fileURLToPath(new URL('../skills/', import.meta.url))

export const name = 'skill-pack'
export const inject = ['tools', 'skills']

// The host ctx shape is not exported by the filesystem provider package;
// this adapter only forwards it unchanged, so an explicit any is fine.
export function apply(ctx: any) {
  applyFilesystemProvider(ctx, {
    providerName: 'skill-pack',
    includeDefaultRoots: false,
    bundledSkillDir: skillsRoot,
    watch: false,
  })

  // --- WikiSkill evolution tools (object-literal registration, no dsh-tools dep) ---
  const textOut = { schema: { type: 'string' }, render: (_a: any, v: any) => [{ type: 'text', text: String(v) }] }
  const reg = (t: any) => { try { ctx.tools.register(t) } catch (e) { console.error('[skill-pack] ' + t.name + ' skipped: ' + e) } }

  reg({
    name: 'skillwiki_status',
    description: 'WikiSkill status: raw/ experience traces, wiki patterns, candidate skills, active skills, recent evolution log.',
    // Explicit empty-object schema. A bare `{}` serializes without `type`, which the
    // provider rejects for the WHOLE run: "Invalid schema for function
    // 'skillwiki_status': schema must be a JSON Schema of 'type: \"object\"', got
    // 'type: null'". A parameterless tool still needs a typed object schema.
    parameters: { type: 'object', properties: {}, required: [] },
    output: textOut,
    execute: () => { const s = wikiStatus(); return 'Skill Wiki (~/.dsh/skill-wiki):\n  raw=' + s.raw + ' patterns=' + s.patterns + ' candidates=' + s.skills + ' active=' + s.active + '\n\nrecent log:\n' + (s.logs.length ? s.logs.join('\n') : '(empty)') },
  })

  reg({
    name: 'skillwiki_audit',
    description: 'Audit the skill wiki AND its bundles, for the two claims two papers make measurable. WikiSkill (arXiv 2608.27454) shows persistent knowledge accumulation is critical - so a pattern no skill references is knowledge that never became executable, and this reports those ORPHANS. SkillZip Pro (arXiv 2608.30785) notes a skill is a directory bundle with progressive loading - so it also reports each bundle token cost, content DUPLICATED between the root and its references (paid on every activation), and references that point at files which do not exist (broken routing: the skill silently loses a branch). Pass catalog to also audit a shipped skills directory.',
    parameters: {
      type: 'object', properties: {
        catalog: { type: 'string', description: 'optional extra directory of skill bundles to audit (e.g. a plugin skills/ dir)' },
      }, required: [],
    },
    output: textOut,
    execute: (args: any) => {
      const a = auditWiki()
      const L: string[] = []
      L.push('Skill wiki audit (~/.dsh/skill-wiki)')
      L.push('  funnel: raw=' + a.funnel.raw + ' patterns=' + a.funnel.patterns + ' candidates=' + a.funnel.candidates + ' active=' + a.funnel.active)
      if (a.candidates.length > 0) {
        L.push('  candidates: ' + a.candidates.length)
        for (const c of a.candidates) {
          L.push('    - ' + c.name + (c.origin ? ' (origin: ' + c.origin + ')' : ' (origin not recorded)') + ' ← ' + (c.patterns.join(', ') || 'no patterns'))
        }
      }
      L.push(a.orphanPatterns.length === 0
        ? '  ORPHANS: none - every pattern is referenced by a skill'
        : '  ORPHANS (' + a.orphanPatterns.length + '): ' + a.orphanPatterns.join(', ') + '  <- knowledge that never reached a skill')
      const fmt = (bs: any[], label: string) => {
        if (bs.length === 0) return
        const bad = bs.filter((b) => b.missingRefs.length > 0 || b.missingDirs.length > 0)
        const dup = bs.filter((b) => b.dupTokens > 0)
        L.push('  ' + label + ': ' + bs.length + ' bundles, ' + bad.length + ' with missing refs, ' + dup.length + ' with root/reference duplication')
        for (const b of bs) {
          if (b.missingRefs.length === 0 && b.missingDirs.length === 0 && b.dupTokens === 0) continue
          L.push('    - ' + b.name + ': root ' + b.rootTokens + ' tok / bundle ' + b.bundleTokens + ' tok / refs ' + b.refs.length
            + (b.missingRefs.length ? ' / MISSING FILE: ' + b.missingRefs.slice(0, 3).join(', ') : '')
            + (b.missingDirs.length ? ' / dir-not-present: ' + b.missingDirs.slice(0, 3).join(', ') : '')
            + (b.dupTokens ? ' / dup ' + b.dupLines.length + ' line(s) ~' + b.dupTokens + ' tok' : ''))
        }
      }
      fmt(a.bundles, 'evolution wiki')
      const cat = String(args?.catalog ?? '').trim()
      if (cat) {
        const b2 = auditTree(cat)
        const totalTok = b2.reduce((n, b) => n + b.bundleTokens, 0)
        const rootTok = b2.reduce((n, b) => n + b.rootTokens, 0)
        L.push('  catalog ' + cat + ': ' + b2.length + ' bundles, ' + rootTok + ' root tok / ' + totalTok + ' bundle tok (~' + Math.round((rootTok / Math.max(1, totalTok)) * 100) + '% always-loaded)')
        fmt(b2, 'catalog detail')
      }
      return L.join(String.fromCharCode(10))
    },
  })

  reg({
    name: 'skillwiki_ingest',
    description: 'Ingest a development experience trace into raw/ (immutable). Use after a debugging/refactor session so the insight becomes skill-evolution material. Optional: from=acp pulls latest ACP compaction summaries as experience.',
    parameters: {
      type: 'object', properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        from: { type: 'string' },
        limit: { type: 'number' },
      }, required: [],
    },
    output: textOut,
    execute: (args: any) => {
      if (args?.from === 'acp') {
        const files = ingestFromAcp(Number(args?.limit) || 10);
        // "0 个"必须能自我解释：没装 handoff 和 schema 读不了是两回事，旧行为都是 0。
        const why = files.length ? '' : '\nACP graph: ' + acpGraphStatusLine();
        return 'ingested ' + files.length + ' ACP checkpoint(s) into raw/' + why;
      }
      if (!args?.title || !args?.content) throw new Error('title and content required')
      const f = ingestExperience(String(args.title), String(args.content))
      logEvolution('ingest', 'experience', String(args.title))
      return 'ingested experience → ' + f
    },
  })

  reg({
    name: 'skillwiki_consolidate',
    description: 'Wiki Maintainer: consolidate an experience pattern into wiki/patterns/. Extracts a reusable failure-mode/strategy with actionable workaround.',
    parameters: {
      type: 'object', properties: {
        name: { type: 'string' }, title: { type: 'string' }, diagnosis: { type: 'string' }, workaround: { type: 'string' },
      }, required: [],
    },
    output: textOut,
    execute: (args: any) => {
      const f = consolidatePattern(String(args.name), String(args.title), String(args.diagnosis), String(args.workaround))
      logEvolution('consolidate', 'pattern', String(args.name))
      return 'consolidated pattern → ' + f
    },
  })

  reg({
    name: 'skillwiki_propose',
    description: 'Skill Proposer: write a candidate SKILL.md (wiki-informed) into skills/. Generates an atomic skill creation/update proposal grounded in wiki patterns.',
    parameters: {
      type: 'object', properties: {
        name: { type: 'string' }, description: { type: 'string' }, body: { type: 'string' }, origin: { type: 'string' }, patterns: { type: 'array', items: { type: 'string' } },
      }, required: [],
    },
    output: textOut,
    execute: (args: any) => {
      const f = proposeSkill(String(args.name), String(args.description), String(args.body), (args?.patterns ?? []).map(String), String(args?.origin ?? ''))
      logEvolution('propose', 'skill', String(args.name))
      return 'proposed skill → ' + f
    },
  })

  reg({
    name: 'skillwiki_gate',
    description: 'Gating: accept or reject a candidate skill. Accepted skills move to skills-active/ (mounted), rejected ones are logged so they are not re-proposed without new evidence.',
    parameters: {
      type: 'object', properties: {
        name: { type: 'string' }, accept: { type: 'boolean' }, score: { type: 'number' },
      }, required: [],
    },
    output: textOut,
    execute: (args: any) => gateSkill(String(args.name), args?.accept === true, args?.score != null ? Number(args.score) : undefined),
  })

  // HTTP: mount on the host web server when the profile ships one.
  //
  // 这里原先的写法是 `ctx.http?.mount?.('/skill-pack', createHonoApp(ctx).fetch)` —— 而
  // **`ctx.http` 不是 DSH 的服务**(官方 90 个 ctx.* 里没有它), 所以可选链让它永远是 no-op:
  // 那条健康检查路由从未生效过, 而 `hono` 依赖却一直背着。
  //
  // 官方范式见 dsh 源码 host/open-in-app/src/index.ts:193-204 与
  // client/connection/src/index.ts:139-159:
  //   ctx.inject(['webServer'], (webCtx) => webCtx.effect(() => webCtx.webServer.register(route), 'label'))
  // handler 拿的是**原生** IncomingMessage/ServerResponse —— DSH 的 web 层本来就是 node:http,
  // 官方不依赖 hono、也没有 Node↔Fetch 桥。所以这里不去造桥, 而是按官方写法直接用 res。
  //
  // 为什么必须用 ctx.inject 而不是 `if (ctx.webServer)`: cordis 的 ctx 是代理, 读一个已
  // 注册但未声明 inject 的服务会**直接抛** "cannot get property ... without inject",
  // 可选链挡不住(get 陷阱先抛), 结果是整个插件激活失败 —— 不只是路由不注册。
  ctx.inject?.(['webServer'], (webCtx: any) => {
    const rejected = createRequestFence(ctx)
    const register = (): (() => void) => webCtx.webServer.register({
      kind: 'exact',
      path: '/api/skill-pack/health',
      handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (rejected(req, res)) return
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('allow', 'GET')
          res.end()
          return
        }
        let skills = 0
        try {
          skills = readdirSync(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).length
        } catch { /* skills dir not readable here */ }
        const body = JSON.stringify({ ok: true, plugin: name, skills })
        res.statusCode = 200
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(body)
      },
    })
    // ctx.effect 让路由随本插件的 fiber 一起释放, 不需要手动存 disposer。
    if (typeof webCtx.effect === 'function') webCtx.effect(register, `skill-pack: GET /api/skill-pack/health`)
    else register()
  })
}

/**
 * Apply the official Host/Origin + browser-auth fence to one plugin's health routes.
 *
 * SOURCE — copied from the official DSH 0.1.7-rc.2 package `@deepseek-ai/dsh-host-open-in-app`,
 * which states the contract in its own module comment
 * (`lib/types/index.js:1-21`): "Security has one home, here. **Every route** asks the
 * composition's `connection` service for a rejection first (`requestRejection`): its Host/Origin
 * fence defeats DNS rebinding and cross-site calls, and its browser authentication (the
 * login-token cookie) gates every caller". The helper shape is `lib/index.js:1263-1270` and its
 * use is the first line of every handler there (`lib/index.js:1274-1275`).
 *
 * `requestRejection` itself (`dsh-client-connection/lib/index.js:586-589`):
 *   403 -> the Host is not loopback/trusted, or `sec-fetch-site: cross-site`, or Origin != Host
 *   401 -> the fence passed but there is no valid login-token cookie
 * so an anonymous request gets 401 and a forged one gets 403. Authentication accepts the
 * `dsh-auth-*` cookie ONLY (minted by the 303 set-cookie on `GET /?token=...`); the boot token
 * itself does not authenticate an API call. A browser that loaded the page first is unaffected.
 *
 * DO NOT "simplify" this away, and do not replace the read with `Reflect.get(ctx, 'connection')`.
 * The official helper is written that way because its own plugin declares `inject: ['connection']`;
 * from a plugin that does not, MEASURED on a live 127.0.0.1 instance, BOTH
 * `ctx.connection` AND `Reflect.get(ctx, 'connection')` throw
 * `cannot get property "connection" without inject` (cordis's proxy get-trap throws before any
 * optional chaining can help), while `ctx.get('connection')` returned the live
 * `HostConnectionService` with `requestRejection` present. `ctx.get` is also the official
 * inject-free service read — `dsh-web-app/lib/index.js:216` gates the ready banner on
 * `connectionCtx.get("connection") !== void 0`.
 *
 * FAIL-CLOSED. When the service is unreachable the request is answered 503, never forwarded:
 * silently serving would reopen exactly the hole this helper exists to close. In this profile
 * the branch is unreachable by construction — the route only registers under
 * `ctx.inject(['webServer'])`, and every composition that has `webServer` also carries
 * `connection` (`dsh-web-app/cordis.patch.yml:210-217` registers it beside the webserver).
 *
 * Each plugin carries its OWN copy on purpose: they are independent packages, and a shared
 * module would create a new deployment coupling (the ACP-graph contract already showed what
 * that costs, with 5 copies to re-sync on every edit).
 */

/** Just enough of the official HostConnectionService for the fence call. */
interface RequestFenceConnection {
  /** @returns 401/403 when the request must be refused, `undefined` when it may proceed. */
  requestRejection: (request: IncomingMessage) => number | undefined
}

/**
 * Build the fence for one plugin life.
 *
 * @param ctx - the plugin's context; only `get` is used, and only at call time.
 * @returns true when the request was answered by the fence and the handler must stop.
 */
function createRequestFence(ctx: unknown): (req: IncomingMessage, res: ServerResponse) => boolean {
  /** Read the service without declaring `inject` — see the read note above for why not Reflect.get. */
  const resolveConnection = (): RequestFenceConnection | undefined => {
    const read = (ctx as { get?: (name: string) => unknown } | null | undefined)?.get
    if (typeof read !== 'function') return undefined
    try {
      const connection = read.call(ctx, 'connection') as RequestFenceConnection | undefined
      return typeof connection?.requestRejection === 'function' ? connection : undefined
    } catch {
      return undefined
    }
  }

  return (req, res) => {
    const connection = resolveConnection()
    if (connection === undefined) {
      // Fail closed: an unreachable fence must not become an open route.
      res.statusCode = 503
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'connection service unavailable: the Host/Origin fence cannot be applied' }))
      return true
    }
    const rejection = connection.requestRejection(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }
}
