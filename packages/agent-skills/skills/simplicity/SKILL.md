---
name: simplicity
description: Use on every prompt and always keep active for coding, planning, reviewing, debugging, refactoring, or file-editing work. Enforces the smallest direct change, no speculative abstractions, direct use of existing business logic, and removal of unnecessary indirection while preserving behavior.
---

# Simplicity

Apply on every prompt, silently. `AGENTS.md`/`CLAUDE.md` take precedence when they speak; otherwise use these defaults.

## Rule

Prefer the smallest direct change that solves the problem. Call existing business/domain logic directly.

Do not add helpers, wrappers, abstraction layers, shared utils, generic types, option bags, registries, factories, or new files unless at least one holds:

- The same non-trivial logic is already duplicated in 3+ places and extracting removes it without hiding local context.
- It gives a domain concept a clear name that materially aids readability.
- It matches an existing local pattern in the repo.
- The code can't reasonably be tested or understood inline.

A helper that only forwards to one existing function (adding logging, tracing, reshaping, relabeling) is presumed wrong — inline the glue at the call site. Avoid pass-through one-liners, speculative future-proofing, moving code away from its only caller, and generic names (`utils`, `helpers`, `manager`, `handler`, `processor`) unless already established.

## Examples to reject

- Identity wrapper: `const serviceId = (h: Handle) => h` → use `h`.
- Alias constant renaming the same literal → keep one named constant.
- Lookup that only forwards to another lookup with one caller → call directly.
- Builder for tiny stable catalog data used by one route → inline the data so the response shape (the contract) is visible at the route.

## Order of preference

1. Direct call to existing code.
2. One-off glue at the call site.
3. Small same-file private helper (only if it clarifies the main flow).
4. Module-level helper (only if reused in the module).
5. Shared/library code (only with explicit justification).

If an abstraction has one caller, keep it local. Don't preserve existing indirection just because it exists; simplify in-scope when safe.

## Verify & report

Simplification must preserve behavior — run the lowest-cost checks matching the risk (format/lint, types, focused tests); say so if you can't. If you do introduce any abstraction, call it out in your final response and explain why inline wasn't enough.
