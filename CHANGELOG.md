# Changelog

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
