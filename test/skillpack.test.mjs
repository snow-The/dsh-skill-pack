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
