# Definition of done (shared reference)

Linked from `incremental-implementation`. Per-increment verification is the LOCAL check;
this is the project-wide one. A task is done when every line below is true, not when the code runs.

## Correctness
- [ ] The change does what the request asked, including the boring cases it implied.
- [ ] Tests cover the new behaviour AND the failure path; they fail when the fix is removed.
- [ ] Nothing that used to work is now silently different — or that difference is written down.

## Evidence
- [ ] The exact command that proves it, and its output, are in the report.
- [ ] Numbers carry their unit and their scope (whole set vs sample, pooled vs per-case).
- [ ] "Not measured" is stated where it is true; an absent signal is never rendered as zero.

## Durability
- [ ] Committed (new files staged — `git commit -a` does not stage untracked files).
- [ ] Deployed copies verified by hash where the host loads them from disk.
- [ ] The reason for the change is written where the next reader will look, not only in the diff.

## Scope discipline
- [ ] No unrelated refactor rode along.
- [ ] What was deliberately NOT done is named, with the trigger that would change it.
- [ ] Follow-ups are recorded as follow-ups, not left as silent gaps.
