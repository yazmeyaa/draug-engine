---
name: typescript-engine-unit-testing
description: Writes fast, deterministic Vitest unit tests for the TypeScript game engine (@draug/engine) that validate behavior, invariants, and public contracts—not implementation details. Use when adding or reviewing engine tests, ECS/world/component coverage, or when the user asks for engine unit test guidance.
---

# TypeScript Engine Unit Testing Skill

You are writing unit tests for a TypeScript game engine package.

Environment:

* Runtime: Node.js v26.2
* Language target: ES2022
* Package type: npm library
* No frontend/browser assumptions
* No backend/web framework assumptions
* Prefer native platform APIs when possible
* Tests must remain fast and deterministic

Primary goal:
Write tests that validate engine behavior, invariants, and state consistency while remaining resilient to internal refactors.

## Core principles

### Test behavior, not implementation

Focus on observable behavior and public contracts.

Avoid:

* Testing private fields
* Testing internal helper calls
* Testing implementation details
* Snapshotting large internal structures unnecessarily

Prefer:

* Verifying state transitions
* Verifying externally observable effects
* Verifying invariants
* Verifying API guarantees

---

### One concern per test

Each test should fail for exactly one reason.

Good:

* "removes entity components after destroy"
* "reuses freed entity ids"

Bad:

* Large scenario tests covering many unrelated behaviors

---

### Deterministic tests only

Tests must produce identical results regardless of:

* execution order
* system time
* timezone
* random seeds
* CPU speed

Never depend on:

* timers without control
* Math.random directly
* wall-clock timing
* external services
* filesystem state unless explicitly isolated

Use controlled mocks/fakes when required.

---

### Fast execution

Unit tests should execute extremely quickly.

Avoid:

* real networking
* real databases
* expensive setup
* sleeping/waiting
* oversized fixtures

Prefer:

* in-memory state
* small isolated worlds
* minimal entity graphs

---

### Prefer explicit setup

Test setup must be local and readable.

Avoid:

* hidden global fixtures
* magic helpers
* deeply abstracted builders unless reused heavily

A reader should understand the entire scenario from the test body.

---

### Validate invariants

For engine code, invariants are more important than happy paths.

Examples:

* entity ids remain unique
* destroyed entities are invalid
* component stores stay synchronized
* queries never return invalid entities
* system execution order is stable
* world state remains internally consistent

---

### Validate edge cases

Always consider:

* empty worlds
* duplicate operations
* repeated destroy/remove calls
* invalid ids
* sparse entity layouts
* component absence
* iteration during mutation
* concurrent-like mutation patterns
* boundary numeric values

---

### Test state transitions

Game-engine code is state-heavy.

Prefer tests that validate:

* before state
* operation
* after state

Example structure:

1. Create world
2. Create entity
3. Add components
4. Execute operation
5. Verify world consistency

---

### Verify idempotency where applicable

Operations that may legally repeat should be tested for stability.

Examples:

* removing missing components
* destroying already destroyed entities
* repeated system registration guards

---

### Avoid logic-heavy tests

Do not reimplement engine logic inside tests.

If the test contains complex branching or calculations, simplify it.

Tests should validate behavior, not duplicate the implementation.

---

### Avoid over-mocking

Prefer real engine objects unless isolation is required.

Mock only:

* time
* randomness
* platform APIs
* external boundaries

Do not mock core engine internals.

---

### Strong typing matters

Tests are TypeScript code and should remain type-safe.

Avoid:

* as any
* unsafe casts
* bypassing compiler guarantees

Prefer:

* strongly typed helpers
* explicit component types
* compile-time validation

---

### Assertions should be precise

Prefer explicit assertions over vague truthiness.

Prefer:

* exact component presence checks
* exact entity counts
* exact state validation

Avoid:

* broad "toBeTruthy" assertions when exact values matter

---

### Recommended test style

Use:

* Arrange / Act / Assert structure
* Small focused test names
* Explicit expectations
* Minimal setup

Preferred naming:

* "creates entity with unique id"
* "removes component from query results"
* "preserves insertion order during iteration"

Avoid vague names:

* "works correctly"
* "basic test"
* "world test"

---

### ECS-specific guidance

Prioritize testing:

* archetype migration correctness
* query consistency
* component lifecycle
* entity recycling
* iteration stability
* deferred command execution
* mutation during iteration
* deterministic ordering
* memory consistency assumptions

Do not couple tests to:

* storage implementation details
* internal array layouts
* optimization strategies

---

### When writing new tests

Before writing a test, determine:

1. What contract is being guaranteed?
2. What invariant could break?
3. What observable behavior matters?
4. Could this test survive a refactor?

If a refactor preserving behavior would break the test, the test is probably too implementation-coupled.

## Project tooling

- Package: `packages/engine` (`@draug/engine`)
- Runner: Vitest (`npm test` in `packages/engine`)
- Imports: `describe`, `it`, `expect`, `beforeEach`, `vi` from `vitest`
