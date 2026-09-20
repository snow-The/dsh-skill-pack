# Testing patterns (shared reference)

Linked from `test-driven-development`. Concrete shapes for JS/TS (Jest, Vitest, React Testing
Library, Supertest), but the shapes are language-neutral.

## The three questions a test must answer
1. What behaviour is being pinned, in the user's words?
2. What would make it fail? (If nothing can, it is not a test.)
3. When it fails at 2am, does the message say what broke?

## Shapes worth reaching for
- **Arrange / act / assert**, one act per test. Two acts means two tests.
- **Boundary table**: empty, one, many, max, over-max, wrong type, unicode, duplicates.
- **Golden fixture** from a real payload (recorded once) beats a hand-written one that drifts.
- **Contract test** at the boundary you own: the tool schema, the HTTP shape, the file format.
- **Mutation check**: break the production line on purpose and watch the test go red. A green suite
  that cannot fail proves nothing about the code and a lot about the test.

## Mocking
- Mock at the EDGE you do not own (network, clock, filesystem), never the module under test.
- A stub that has a field the real thing lacks is how a green suite hides a real bug: prefer
  fixtures that imitate the real shape, and assert the shape you depend on.

## What not to test
- Implementation details (private helpers, call order without meaning).
- Framework behaviour. Test your use of it, not the framework.
- Anything that needs a live third party in CI: record it, or mark it as an integration test.
