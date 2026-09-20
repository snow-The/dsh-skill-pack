# Performance checklist (shared reference)

Loaded only when a review or an optimisation pass needs it. Linked from
`code-review-and-quality` (review-time) and `performance-optimization` (fix-time).

## 0. Before anything: measure
- [ ] A number, on this machine, before and after. "Feels faster" is not evidence.
- [ ] State the unit and the workload: latency (p50/p99), throughput, tokens, bytes, queries.
- [ ] Optimising without a baseline is guessing with extra steps.

## 1. The shape of the cost
- [ ] N+1 queries: one query per item in a loop. Batch, join, or prefetch.
- [ ] Unbounded reads: no `LIMIT` on a table that grows; no full scan in a request path.
- [ ] Repeated work in a loop: hoist, memoise, or precompute against the real key.
- [ ] Quadratic string building: join an array instead of concatenating in a loop.

## 2. Allocation and I/O
- [ ] Large buffers copied per call: stream or slice instead.
- [ ] Sync I/O on a hot path (a server loop, an event handler).
- [ ] Cache invalidation: if you cache, say what makes it stale, in the same place.

## 3. Context and tokens (agent-side costs count)
- [ ] Anything always-loaded is paid on every turn: keep the root small, put detail behind a link.
- [ ] Tool output that a human never reads should not enter the prompt: summarise or store it.
- [ ] The budget is a range with an optimum, not "more is better" — retrieval peaks and then declines.

## 4. Anti-patterns seen in this repo
- [ ] A hot path that re-parses the same file per call.
- [ ] A "cache" that is really a second source of truth.
- [ ] A retry loop without backoff, turning a soft limit into a block.
