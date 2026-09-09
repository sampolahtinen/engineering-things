# Migrating Mantine components to shadcn

A generalized version of the component migration procedure developed for the Prisma Console. Use it after choosing shadcn and a shared token vocabulary for your project. A component cutover and the eventual removal of Mantine are separate jobs.

## 1. Prepare coexistence

Identify the current theme providers, global styles, CSS ordering, resets, and dark-mode selector. Introduce the new token and styling foundation without unintentionally restyling the remaining Mantine screens.

Inspect the effect of Tailwind's reset before enabling it across an existing application. In a mixed application, defer or scope global resets until untouched components have been verified. Keep legacy token names where existing consumers still need them.

Choose representative pages for the initial baseline, including a dense page, a form, an overlay, and supported themes.

## 2. Enumerate one component's consumers

Choose a pilot, such as Button. Add an import restriction for that component through the project's legacy barrel, then run the linter to surface consumers. Existing lint failures become the cutover work list; the final change must restore a passing check.

Cross-check direct `@mantine/core` imports, relative imports, re-exports, shared UI internals, and every consuming application. Use repository search and the type checker as well as lint. No single import-path search covers all forms of usage.

Build a usage matrix from those consumers: variants, sizes, icon placement, link behavior, loading, disabled state, and interactions. Port the behavior production needs rather than Mantine's entire API.

## 3. Generate and adapt the replacement

Use the project's shadcn configuration to generate the component into its normal UI source directory. For a pnpm project with `components.json` configured, the command shape is:

```bash
pnpm dlx shadcn@latest add button
```

Inspect the generated changes before adapting them; do not overwrite an existing component blindly. See the [shadcn CLI reference](https://ui.shadcn.com/docs/cli) for the installed version's options. If generation cannot produce the target, record the reason and choose a scoped fallback explicitly.

Style with the approved semantic tokens and existing variant conventions. Keep the component's location about its role, not its origin in a library.

Rewrite library-specific composition at each consumer. For a Radix-based replacement, a polymorphic Mantine button may become an `asChild` button containing a link. Confirm the actual generated API; shadcn configurations differ. Verify disabled links, loading behavior, event handling, and focus after the change.

## 4. Build the comparison story

Render the old and new components next to each other in the same story. Label the sides clearly and cover the production variants, sizes, and applicable states: default, hover, focus, active, disabled, and loading.

Use real interactions or a documented state-forcing technique. Do not duplicate old theme constants into a separate story stylesheet; derive comparison styling from the old implementation when necessary.

Compare supported themes at the same viewport. Fix unexpected differences. Record intentional differences where the new design vocabulary changes the result. Do not add color tokens just to recreate every historical shade without a shared design reason.

## 5. Complete the cutover

Replace the consumers identified in the usage matrix, including shared composites and secondary applications. Remove the old public export and keep its import restriction. Type-check every consumer to catch missed relative imports or re-exports.

Retain an old implementation only while a comparison story needs it; keep it unavailable to production consumers and record when it can be deleted. Run the project's format, type, lint, story-build, and affected test checks.

## 6. Verify the application surface

Trace the component through shared compositions to the routes that render it. Map each capture as visible on load, interaction required, or story-only. A dialog's closed route is not its primary visual evidence.

Capture every mapped application state that can be reproduced, using consistent data, theme, viewport, and browser settings. Include a representative benchmark route to make review easy, without treating that one route as complete coverage.

Pair before and after images from known revisions. Label missing baselines and skipped states. Keep intentional design differences separate from accidental regressions. The [screenshot-routes skill](../skills/screenshot-routes/SKILL.md) provides the capture workflow.

## 7. Review and repeat

Bring the comparison story, route images, verification results, and accepted differences to human review. Finish one component cutover before beginning dependent work. Independent components can run in separate checkouts, but shared import restrictions and export files need coordinated merges.

Refresh affected baselines after an accepted migration lands so the next component is compared against the current application.

## 8. Remove Mantine when the consumers are gone

Only after the remaining components have migrated, remove dependencies, providers, layered styles, and dark-mode bridges. Check CSS modules for surviving Mantine variables and classes as well as TypeScript imports.

Verify the application again after any global reset or theme change. Removing the final import alone does not establish that removing the stylesheet is safe.
