# Orchestration patterns (shared reference)

Linked from `doubt-driven-development`. How to run a review/spawn a check without creating a
system that spawns itself.

## Pattern 1 — one reviewer, one question
Spawn a fresh context with a single, falsifiable question and the artifact. Not "review this", but
"does this diff change behaviour when `X` is empty, and where is the proof?".

## Pattern 2 — adversarial pass, then reconcile
A second context argues the OPPOSITE of the first. Reconcile on evidence, not on seniority. If the
two agree immediately, the question was probably too easy to be worth the spawn.

## Pattern 3 — bounded fan-out
Independent subtasks in parallel, each with the same input contract and the same output shape.
A fan-out whose children can spawn children is a fork bomb with extra steps: cap the depth in the
contract, not in the prompt.

## What a spawned check must return
- The verdict, in the vocabulary of the question asked.
- The evidence (command, file:line, number) — not a summary of the evidence.
- What it could NOT check. Silence is not a pass.

## Failure modes to design against
- **Self-confirmation**: the child inherits the parent's conclusion as an assumption. Give it the
  artifact and the question, never the answer.
- **Unbounded recursion**: a skill that instructs "do this for each finding" without a stop rule.
- **Phantom verification**: a check that reports PASS without running anything.
