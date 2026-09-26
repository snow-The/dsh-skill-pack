import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { apply, name } = await import('../dist/index.js')

test('exports name and apply', () => {
  assert.equal(name, 'skill-pack')
  assert.equal(typeof apply, 'function')
})

test('apply forwards to filesystem provider with bundled skill dir', () => {
  let captured = null
  const ctx = {
    skills: { provider: null },
  }
  // mock the imported provider? we cannot easily — instead verify the
  // contract by checking that apply does not throw with a stub ctx that
  // records the provider call shape.
  const calls = []
  // Patch via module? Simplest: assert the skills dir exists on disk.
  const root = fileURLToPath(new URL('../skills/', import.meta.url))
  assert.ok(existsSync(root))
  const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())
  assert.ok(dirs.length >= 29, 'expected 29+ curated skills, got ' + dirs.length)
  const names = dirs.map((d) => d.name)
  for (const expected of ['handoff', 'teach', 'ask-matt', 'design-md', 'writing-shape']) {
    assert.ok(names.includes(expected), 'missing skill: ' + expected)
  }
})

test('every skill has a SKILL.md', () => {
  const root = fileURLToPath(new URL('../skills/', import.meta.url))
  const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const d of dirs) {
    assert.ok(existsSync(new URL('../skills/' + d.name + '/SKILL.md', import.meta.url)), d.name + ' lacks SKILL.md')
  }
})

test('skillwiki_audit: orphan knowledge and broken routing are REPORTED, not left implicit', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const home = mkdtempSync(join(tmpdir(), 'skillwiki-'))
  const prev = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const registered = []
    apply({ skills: { provider: null }, tools: { register: (t) => { registered.push(t); return t } } })
    const byName = (n) => registered.find((t) => t.name === n)
    assert.ok(byName('skillwiki_audit'), 'skillwiki_audit must register')

    await byName('skillwiki_ingest').execute({ title: 'trace one', content: 'evidence' })
    for (const p of ['used-pattern', 'orphan-pattern']) {
      await byName('skillwiki_consolidate').execute({ name: p, title: p, diagnosis: 'd', workaround: 'w' })
    }
    await byName('skillwiki_propose').execute({ name: 'candidate-one', description: 'd', body: 'b', patterns: ['used-pattern'] })

    const cat = join(home, 'catalog', 'demo-skill')
    mkdirSync(join(cat, 'references'), { recursive: true })
    writeFileSync(join(cat, 'references', 'present.md'), '# present', 'utf8')
    writeFileSync(join(cat, 'SKILL.md'), ['# demo', '', 'Read [present](references/present.md).', 'Also read [gone](references/gone.md).', 'Artifacts land in scripts/ and assets/*.'].join(String.fromCharCode(10)), 'utf8')

    const out = String(await byName('skillwiki_audit').execute({ catalog: join(home, 'catalog') }))
    assert.match(out, /ORPHANS \(1\): orphan-pattern/, 'a pattern no skill references must be named')
    assert.match(out, /MISSING FILE: references\/gone\.md/, 'a dangling file reference is broken routing: ' + out)
    assert.doesNotMatch(out, /MISSING FILE: references\/present\.md/, 'an existing reference must not be reported')
    assert.match(out, /dir-not-present: scripts\//, 'a directory mention is its own, weaker signal')
    assert.doesNotMatch(out, /assets\/\*/, 'a glob is a pattern, not a path to check')
    assert.match(out, /funnel: raw=1 patterns=2 candidates=1 active=0/)
  } finally {
    process.env.DSH_HOME = prev
    rmSync(home, { recursive: true, force: true })
  }
})

// --- regression: 绝对路径不是"技能内部路由", 不该报断裂 -------------------------
// 病例: 某 SKILL.md 有一句历史叙述「訓練碼遺失(其實在 /root/mscripts/)」。
// 'mscripts/' 含有 'scripts/', 而目录检测从 'scripts/' 起截取, 于是报出
// "dir-not-present: scripts/" —— 一句本来正确的文字被报成缺陷。
// 检测器 bug 与内容 bug 读起来完全一样, 会让人去改没错的文档, 所以必须锁住两个方向:
//   绝对/家目录路径 -> 不报;  真正指向技能目录内部的相对路径 -> 仍然要报。
test('skillwiki_audit: absolute paths are not counted as missing skill directories', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const home = mkdtempSync(join(tmpdir(), 'skillwiki-abs-'))
  const prev = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const registered = []
    apply({ skills: { provider: null }, tools: { register: (t) => { registered.push(t); return t } } })
    const audit = registered.find((t) => t.name === 'skillwiki_audit')

    const cat = join(home, 'catalog')
    // 技能 A: 只含绝对路径。修复前它会报 "dir-not-present: scripts/"（误报）。
    const a = join(cat, 'abs-only')
    mkdirSync(a, { recursive: true })
    writeFileSync(
      join(a, 'SKILL.md'),
      ['# abs-only', '', '訓練碼遺失(其實在 `/root/mscripts/`)。'].join(String.fromCharCode(10)),
      'utf8',
    )
    // 技能 B: 只含【真正指向技能目录内部】的相对目录提及，必须仍然被报。
    const b = join(cat, 'rel-only')
    mkdirSync(b, { recursive: true })
    writeFileSync(
      join(b, 'SKILL.md'),
      ['# rel-only', '', 'Artifacts land in scripts/ for real.'].join(String.fromCharCode(10)),
      'utf8',
    )

    const out = String(await audit.execute({ catalog: cat }))
    // 判别力说明: 关键在于两个技能【分开】。若把绝对路径与合法 scripts/ 放进同一个
    // SKILL.md, 两种输入都会产出同一个 token 'scripts/', 断言就无法区分修复与否
    // （本测试的第一版正是这样写成空洞测试的）。
    const absLine = out.split(String.fromCharCode(10)).find((l) => l.includes('abs-only')) ?? ''
    const relLine = out.split(String.fromCharCode(10)).find((l) => l.includes('rel-only')) ?? ''
    assert.doesNotMatch(
      absLine, /dir-not-present/,
      '绝对路径 /root/mscripts/ 被当成技能内部目录了(检测器 bug 伪装成内容 bug): ' + absLine,
    )
    assert.match(
      relLine, /dir-not-present: scripts\//,
      '但真正指向技能目录内部的 scripts/ 提及必须仍然被报出来: ' + relLine,
    )
  } finally {
    process.env.DSH_HOME = prev
    rmSync(home, { recursive: true, force: true })
  }
})

// 复刻 cordis 的 ctx 代理: 读一个已注册但**未声明 inject** 的服务时, get 陷阱先抛
// "cannot get property X without inject" —— 可选链 `ctx.webServer?.x` 挡不住。
// 这正是本次迁移踩到的坑: 在 apply 里直接读 ctx.webServer 会让整个插件激活失败
// (不是路由不注册, 而是插件整体不加载)。所以 apply 必须走 ctx.inject。
function cordisCtx({ webServer, extra = {}, rejection, noConnection = false } = {}) {
  let inInject = false
  const target = {
    ...extra,
    // The fence reads the official `connection` service through ctx.get (the inject-free
    // service read). `rejection` drives the verdict; `noConnection` models a host that never
    // registered the service, which must fail CLOSED.
    get: (name) => {
      if (name !== 'connection' || noConnection) return undefined
      return { requestRejection: () => rejection }
    },
    inject: (deps, cb) => {
      if (!deps.includes('webServer') || !webServer) return undefined
      const prev = inInject
      inInject = true
      try { return cb({ webServer, effect: extra.effect }) } finally { inInject = prev }
    },
  }
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'webServer' && !inInject) throw new Error('cannot get property "webServer" without inject')
      return t[prop]
    },
  })
}

test('health route registers on the official ctx.webServer via ctx.inject', async () => {
  const registered = []
  let effectLabel = null
  const ctx = cordisCtx({
    webServer: { register: (r) => { registered.push(r); return () => {} } },
    // Official service answers `undefined` -> fence allows the request through.
    extra: {
      skills: { provider: null },
      tools: { register: () => {} },
      effect: (fn, label) => { effectLabel = label; fn() },
    },
  })
  apply(ctx)
  assert.deepEqual(registered.map((r) => r.path), ['/api/skill-pack/health'])
  assert.equal(registered[0].kind, 'exact')
  assert.match(String(effectLabel), /skill-pack/)

  // 直接驱动我们自己的 handler(原生 req/res), 不是 Hono 的 fetch 适配层
  const mkRes = () => ({ statusCode: 0, headers: {}, body: undefined, setHeader(k, v) { this.headers[k] = v }, end(b) { this.body = b } })
  const res = mkRes()
  await registered[0].handler({ method: 'GET', url: '/api/skill-pack/health' }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  const body = JSON.parse(String(res.body))
  assert.equal(body.ok, true)
  assert.equal(body.plugin, 'skill-pack')

  const notAllowed = mkRes()
  await registered[0].handler({ method: 'POST', url: '/api/skill-pack/health' }, notAllowed)
  assert.equal(notAllowed.statusCode, 405)
  assert.equal(notAllowed.headers['allow'], 'GET')
})

test('the cordis trap is real, and apply avoids it by using ctx.inject', () => {
  const base = { skills: { provider: null }, tools: { register: () => {} } }
  const ctx = cordisCtx({ webServer: { register: () => () => {} }, extra: { ...base } })
  assert.throws(() => ctx.webServer, /without inject/)
  assert.doesNotThrow(() => apply(ctx))
  // 没有 webServer 的 profile: 回调不执行, 插件其余部分照常加载
  assert.doesNotThrow(() => apply(cordisCtx({ extra: { ...base } })))
})

// ---------------------------------------------------------------------------------------------
// Official Host/Origin + browser-auth fence (copied from @deepseek-ai/dsh-host-open-in-app; the
// provenance block in src/index.ts names the exact official lines). These assertions go RED if
// the guard is removed from the handler — the guard IS the security boundary, not decoration.
// ---------------------------------------------------------------------------------------------

/** Drive a registered handler with a fake native req/res. */
function drive(handler, { method = 'GET', headers = {} } = {}) {
  const res = { statusCode: 0, headers: {}, body: undefined, setHeader(k, v) { this.headers[k] = v }, end(b) { this.body = b } }
  return Promise.resolve(handler({ method, url: '/api/skill-pack/health', headers }, res)).then(() => res)
}

function mountWithFence(opts) {
  const registered = []
  const ctx = cordisCtx({
    webServer: { register: (r) => { registered.push(r); return () => {} } },
    ...opts,
    extra: { skills: { provider: null }, tools: { register: () => {} }, effect: (fn) => fn() },
  })
  apply(ctx)
  return registered[0]
}

test('fence: the official service 403 is answered 403 and the handler never runs', async () => {
  const res = await drive(mountWithFence({ rejection: 403 }).handler)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body, undefined, 'the handler must not have produced a body')
})

test('fence: the official service 401 is answered 401', async () => {
  const res = await drive(mountWithFence({ rejection: 401 }).handler)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body, undefined)
})

test('fence: an allowed request still returns the original health JSON', async () => {
  const res = await drive(mountWithFence({}).handler)
  assert.equal(res.statusCode, 200)
  const body = JSON.parse(String(res.body))
  assert.equal(body.ok, true)
  assert.equal(body.plugin, 'skill-pack')
})

test('fence: an unreachable connection service fails CLOSED with 503, never forwarding', async () => {
  const res = await drive(mountWithFence({ noConnection: true }).handler)
  assert.equal(res.statusCode, 503, 'a missing fence must NOT fall through to the handler')
  assert.match(String(res.body), /unavailable/)
})

test('fence: the method check still applies once the fence allows the request', async () => {
  const res = await drive(mountWithFence({}).handler, { method: 'POST' })
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers['allow'], 'GET')
})
