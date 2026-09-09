# A UI harness for coding agents

These are generalized versions of the guidelines and skills Sampo Lahtinen developed while redesigning the Prisma Console. They cover design decisions, Storybook development, component migration, and visual review.

The working agreement is simple: the engineer sets direction and reviews the evidence; agents implement and verify. These files make that agreement repeatable.

## What is included

| File | Job | Read it when |
| --- | --- | --- |
| [Design doctrine](../skills/write-ui/references/design-doctrine.md) | Defines the visual language, component boundaries, and review standard | Setting up the project or deciding how a view should be built |
| [Write UI](../skills/write-ui/SKILL.md) | Runs the implementation and verification workflow | Creating or changing UI, including route-only fixes |
| [Design to code](../skills/design-to-code/SKILL.md) | Translates a visual reference into production components | Working from a design bundle, prototype, or screenshot |
| [Mantine to shadcn](mantine-to-shadcn.md) | Replaces one component across its consumers with comparison evidence | Migrating an existing application |
| [Screenshot routes](../skills/screenshot-routes/SKILL.md) | Maps affected screens and captures reproducible states | Preparing visual comparisons or a pull request |
| [PR screenshots](../skills/write-ui/references/pr-screenshots.md) | Defines the evidence to attach and how to host it | Preparing a UI change for review |

The skills contain instructions and reference material. They do not install Storybook, a browser driver, lint rules, hooks, or continuous integration workflows. Adopt those in your project and verify them separately.

## 1. Install the skills

Clone this repository, then copy each complete skill directory into your project's agent skill directory. For a project using `.agents/skills`, copy:

```text
packages/agent-skills/skills/write-ui/          -> .agents/skills/write-ui/
packages/agent-skills/skills/design-to-code/    -> .agents/skills/design-to-code/
packages/agent-skills/skills/screenshot-routes/ -> .agents/skills/screenshot-routes/
```

Keep the `references/` directories with their skills. The three skills also work independently; none requires a sibling skill to be installed. If your agent uses a different discovery directory, use that directory and confirm it can find the skills. Review any existing skill with the same name before replacing it.

Copy the doctrine to your project's canonical location, such as `docs/DESIGN.md`, and adapt it there. If migrating Mantine, copy the migration guide too. Keep project policy in one place; the bundled doctrine becomes a starting template once your project has its own.

## 2. Connect the instructions to your project

Record these facts in your existing agent entry point or UI contributor guide:

- The UI source directory, component import prefix, and canonical design document.
- The token file, supported themes, and two or three representative pages and stories.
- The application and Storybook start commands, plus the browser tool agents can use.
- The format, type check, lint, and affected test commands that actually exist.
- How to prepare synthetic data, authenticate locally, and share screenshot evidence.

Example entry-point instruction, after those paths exist:

```markdown
For any UI change, including a bug fix that touches route markup or styles,
read `.agents/skills/write-ui/SKILL.md` and `docs/DESIGN.md` first.
Build reusable components and views in Storybook before application integration.
Bring rendered screenshots for each changed view and its relevant states to review.
```

Put the pointer where route work as well as component work encounters it. If you add an edit hook, match every relevant UI directory and the actual edit tools your agent uses. Exercise the hook with a route edit. A configured hook is not evidence that it runs.

## 3. Add enforcement to match the rules

Use existing lint tooling where possible. Start with rules that have a clear replacement: forbidden legacy imports, dependencies that do not belong in presentation views, and styling values outside the project's token policy. Run them locally and in continuous integration.

For existing violations, record allowances by rule, file, and value, with counts. Fail increases above those allowances. Reduce the allowances when cleanup lands. Review baseline changes as carefully as code; a baseline that can be regenerated is not an automatic guarantee that debt only shrinks.

Make errors useful: report the rule, location, and expected replacement. Do not forbid an old token until there is a supported alternative.

Screenshots remain a review requirement unless you separately implement an automated presence check. Such a check can detect a missing image; it cannot establish that the image covers the right state or that the design is good.

## 4. Try one small change

Choose a button, a settings section, or one dialog. Give the agent a task like:

> Use write-ui to update this settings section. Read our design doctrine and inspect the existing components first. Build the real view in Storybook, verify its default, error, and disabled states, then connect it to the app. Run the project checks and bring screenshots of both the story and the integrated view. List any differences or missing coverage.

For a reference-driven change, ask for design-to-code. For route comparisons, ask for screenshot-routes. Review the evidence and adjust the instructions when a real task exposes a gap.

## What was generalized

The original files referenced a particular monorepo, internal routes, component names, test accounts, preview infrastructure, commands, and migration progress. Those details have been replaced with project discovery and explicit setup steps. The comparison workflow, Storybook-first order, design ownership, and screenshot review standard remain.

This is the reusable instruction layer of the original harness. The project's custom lint implementation, hook configuration, internal screenshots, and application code are not included.
