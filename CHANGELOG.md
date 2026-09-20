# Changelog

## 0.3.0

- feat(references): the **shared reference layer** the skills were already pointing at. Five skills
  carry `../../references/<doc>.md` links that resolved to nothing; the layer now exists with real
  content — `security-checklist.md`, `performance-checklist.md`, `testing-patterns.md`,
  `definition-of-done.md`, `orchestration-patterns.md` — and is declared in `files` so it ships.
  This is progressive disclosure in the shape SkillZip Pro (arXiv 2608.30785) describes: the root
  stays small, the detail is loaded only when a branch needs it.
- fix(audit): bare path mentions kept their `../` prefix. Dropping it made every `../../references/x`
  resolve INSIDE the skill directory, so a shared layer that does exist was reported as seven broken
  links — a detector bug that read exactly like a content bug, and that survived a first round of
  "fixing the content". The catalog now reports 3 items instead of 9 (one illustrative placeholder
  path, corrected in the skill text, plus two directory mentions that are a weaker signal by design).
- feat(provenance): a proposed skill records its **origin** (which model/session evolved it), because
  WikiSkill (arXiv 2608.27454) finds evolved skills transfer across models — and skills evolved by
  another model can beat self-evolved ones, which is only actionable if the origin is written down.
  The audit now lists candidates with their origin and the patterns they compile.
- feat(evolution): the wiki's single **orphan pattern** (`dsh-session-log-multiframe` — a DSH session
  log whose first zstd frame is not exactly one header line) is compiled into a candidate skill with
  its origin recorded. `ORPHANS: none` for the first time.
- measured before/after on our own catalog: **9 → 3** unresolved routes, **1 → 0** orphan patterns,
  0 → 1 candidate with provenance; bundle accounting corrected to include the shared layer
  (73,568 → 76,387 bundle tokens; always-loaded root share 87% → 84%).

## 0.2.0

- feat(skillwiki_audit): an audit for the two claims two papers make measurable.
  - **WikiSkill** ([arXiv 2608.27454](https://arxiv.org/abs/2608.27454)) separates raw experience /
    accumulated knowledge / executable skills and shows by ablation that persistent knowledge
    accumulation is critical. A pattern that no skill references is knowledge that never reached an
    executable form — invisible in a plain file count, so the audit reports those **orphans** by name.
  - **SkillZip Pro** ([arXiv 2608.30785](https://arxiv.org/abs/2608.30785)): a skill is a **directory
    bundle** with progressive loading, so the audit reports each bundle root-vs-total token cost,
    content **duplicated** between root and reference (paid on every activation), and references that
    point at files which do not exist — broken routing, where the skill silently loses a branch.
  - Measured on our own catalog the first time it ran: **32 bundles, 64,037 root tokens vs 73,568
    bundle tokens (~87% always-loaded)**, and **9 skills whose routes did not resolve** — 7 of them
    pointing at reference FILES that do not exist (e.g. `code-review-and-quality` asks for
    `references/security-checklist.md` and `references/performance-checklist.md`, neither shipped).
- fix(audit): directory mentions are no longer counted as broken file links. The first version cried
  wolf 9 times out of 32 because it treated `scripts/` and `assets/*` as missing files; a glob is a
  pattern rather than a path, and an extension-less mention is now reported as its own weaker signal.
- test: drives the whole loop through the registered tools on a temp wiki (ingest → consolidate two
  patterns → propose a skill that references ONE of them) and asserts the orphan, the dangling file,
  the directory signal, the glob skip and the funnel counts. 4/4.
