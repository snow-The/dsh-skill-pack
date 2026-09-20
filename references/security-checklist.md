# Security checklist (shared reference)

Loaded only when a review or a hardening pass needs it. Two skills link here:
`code-review-and-quality` (review-time) and `security-and-hardening` (fix-time).

## 1. Trust boundaries
- [ ] Name every place data crosses a boundary: user input, network, file, subprocess, model output.
- [ ] For each: is it validated, and is the validation at the boundary rather than deeper in?
- [ ] Model output is UNTRUSTED input. A tool call built from model output is a boundary.

## 2. Injection
- [ ] SQL: parameterised statements only; string-built queries are a finding even when escaped.
- [ ] Shell: argv arrays, never string interpolation; no `shell: true` on user data.
- [ ] Paths: reject `..`, resolve then verify the result is inside the intended root.
- [ ] HTML/templates: context-aware escaping; `innerHTML` on model or user text is a finding.

## 3. Secrets
- [ ] None in source, tests, fixtures, logs or error messages.
- [ ] Read from the environment or a credential store; never written back to a file.
- [ ] A leaked key is rotated, not deleted: assume it is already copied.

## 4. Authn / authz
- [ ] Every handler that mutates state checks authorisation, not only authentication.
- [ ] Deny by default: an unknown role gets nothing, not "the usual".
- [ ] Ownership is checked on the object, not inferred from the route.

## 5. Dependencies and supply chain
- [ ] New dependency: why this one, what it pulls, is it maintained.
- [ ] Lifecycle scripts (`postinstall`) in a plugin are a finding until explained.
- [ ] Lockfile committed; version ranges pinned for anything security-relevant.

## 6. Failure behaviour
- [ ] Errors do not leak internals (stack, paths, SQL) to the caller.
- [ ] Rate limits and timeouts on anything reachable from outside.
- [ ] A failure is loud in logs and quiet to the user — not the other way round.
