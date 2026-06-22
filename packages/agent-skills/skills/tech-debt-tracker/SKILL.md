---
name: tech-debt-tracker
description: Lightweight tech debt ledger for capturing cleanup items mid-development without derailing the current task, then triaging them later when the project ships. Triggers when the user says things like "add to tech debt", "note this as debt", "log this for later", "we'll fix this later", "remind me to clean this up", or asks to review/triage/implement debt items. Also proactively offers to capture when the current task introduces a deliberate shortcut — hardcoded values, swallowed errors, skipped tests, copy-paste that should be abstracted, TODO/FIXME/HACK comments, or "I know this is gross but..." moments.
---

# Tech Debt Tracker

A two-mode skill for keeping a running list of cleanup items without breaking flow.

- **Capture mode** runs mid-development. Append-only. Cheap. No analysis, no rewrites, no derailing the current task.
- **Review mode** runs between projects. Triage, prune, fix.

The default ledger artifact is `TECH_DEBT.md`, but existing repository conventions win. Before creating a new file, scan for tech-debt-related Markdown files and use the existing ledger if one is present, such as `docs/TechDebt.md`.

---

## Operating principles

**Do not derail.** If the user is mid-task, capturing a debt item is a sub-second side effect: append, confirm, return. No summarizing the list, no re-ranking everything, no proposing fixes unless asked.

**Prefer too many entries over too few.** Capture is cheap; missed debt is what costs. If the user says "log it", log it — don't second-guess severity.

**One file, append-only, grep-friendly.** Resist clever structure. Future-you needs to be able to `rg TD-` and find everything.

**Don't audit unprompted.** This skill is for debt the user *or Claude* notices while doing something else. It is not an excuse to scan the wider codebase for problems. That's what ksimback's tech-debt-audit is for.

---

## Capture mode

Trigger phrases include: "add to tech debt", "log as debt", "note for later", "we'll clean this up", "TD this", "remind me to fix", "debt list".

Also trigger proactively (offer once, don't nag) when the work-in-progress includes:

- Hardcoded value that should be configurable (env var, constant, magic number).
- `catch` block that swallows or only logs.
- New code path with no test coverage where peers have tests.
- Copy-pasted block (>5 lines) duplicating logic already present elsewhere.
- A `TODO` / `FIXME` / `HACK` / `XXX` comment being introduced.
- A type assertion, `any`, `as unknown as X`, `# type: ignore`, or other escape-hatch being added.
- A migration / rename / refactor left half-done because the user said "good enough for now".

When offering proactively, do it in **one line**, inline with the work: *"Want me to log this as debt? (TD)"* — yes proceeds, anything else drops it.

### Capture procedure

1. Resolve the ledger path:
   - First scan from the repo root for existing tech-debt Markdown files, e.g. `rg --files | rg -i '(^|/)(tech[-_]?debt|techdebt).*\.md$'`.
   - Prefer an existing project-local ledger over creating a new one. Examples: `docs/TechDebt.md`, `docs/TECH_DEBT.md`, `TECH_DEBT.md`.
   - If none exists, create `TECH_DEBT.md` at the repo root using the template below.
2. Read or create the resolved ledger file.
3. Find the highest existing `TD-NNN` ID; the new entry is `TD-NNN+1`, zero-padded to 3 digits.
4. Append a new section under `## Open` using the entry format below. Do **not** rewrite or reorder existing entries.
5. Confirm in one line: `Logged as TD-014.` Optionally include the ledger path or file:line. That's it.
6. Return immediately to the in-flight task.

### Entry format

Required: ID, date added, description. Everything else optional — fill what you know, leave the rest off. Don't ask the user to clarify just to fill fields.

```markdown
### TD-014 — Hardcoded retry count in BillingService
- **Added:** 2026-05-26
- **Location:** `src/billing/service.ts:142`
- **Severity:** Medium · **Effort:** S
- **Description:** `maxRetries = 3` is hardcoded. Should be per-environment.
- **Sketch:** Move to `config/billing.ts` next to the other Stripe settings.
```

Severity: `Low` / `Medium` / `High`. Default `Medium` when unspecified.
Effort: `S` (<1h) / `M` (half day) / `L` (>1 day). Default `M` when unspecified.

The title should be one line, action-oriented, no period. Severity and effort go on one line separated by `·`.

---

## Review mode

Trigger phrases: "review tech debt", "what's in the debt list", "let's tackle some debt", "tech debt triage", "implement some debt items", "ship some debt fixes".

### Review procedure

1. Resolve the ledger path using the same discovery rules as capture mode, then read it. Show counts: `12 open · 4 high · 6 medium · 2 low`.
2. Surface stale items: anything `Added` more than 90 days ago. Ask if they're still relevant before doing anything else — kill stale items aggressively (move to `## Dropped` with a one-line reason).
3. Offer a triage view. The user picks one:
   - **By severity** — High first.
   - **By effort** — quick wins first (Low/Medium severity × S effort).
   - **By location** — group entries that touch the same file/module so they can be batched.
   - **By age** — oldest first.
4. Recommend a batch of 3–5 items for *this* session. Don't propose to fix all 12. Match the batch to the user's stated time budget if given.
5. For each item the user picks to fix:
   - Re-read the location to check if it's still accurate (codebase has moved).
   - If the item is stale or already resolved by other work, mark `## Resolved` with note `Resolved incidentally by …` and move on.
   - Otherwise, make the change, write/extend tests, commit. Then update the entry status.

### Status transitions

Entries move between three sections: `## Open`, `## Resolved`, `## Dropped`. Move the whole entry block; do not delete.

When marking `Resolved`, append a `**Resolved:**` line with date and PR or commit ref:

```markdown
### TD-014 — Hardcoded retry count in BillingService
- **Added:** 2026-05-26 · **Resolved:** 2026-06-12 (PR #1842)
- **Location:** `src/billing/service.ts:142`
- ...
```

When marking `Dropped`, append a `**Dropped:**` line with date and one-line reason:

```markdown
- **Added:** 2026-03-01 · **Dropped:** 2026-05-26 (entire module rewritten, no longer applies)
```

---

## Rules

- **Never silently edit `## Resolved` or `## Dropped`.** They're history.
- **Never collapse multiple debt items into one entry**, even if they're related. One concrete fix per entry. If two items share a sketch, link by ID in the description: `Related: TD-007`.
- **Don't grade severity from your own opinion.** If the user logged something as Low and you think it's High, say so in chat — don't silently upgrade it in the file.
- **If no tech-debt Markdown file exists**, create `TECH_DEBT.md` at the repo root with the template below the first time capture is invoked. Don't pre-create it before there's anything to add.
- **Don't auto-commit the ledger file.** Leave the file change in the working tree; the user decides when to commit (it often goes in the same PR as the work that created the debt).

---

## `TECH_DEBT.md` template (used on first creation)

```markdown
# Tech Debt

Running log of cleanup items. Add via the `tech-debt-tracker` skill during development; review between projects.

- **Open:** items still worth fixing.
- **Resolved:** done, kept for history.
- **Dropped:** no longer relevant (with reason).

Entry IDs are monotonically increasing — `TD-001`, `TD-002`, ... — and never reused.

## Open

_None yet._

## Resolved

_None yet._

## Dropped

_None yet._
```
