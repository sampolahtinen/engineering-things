# Product UI design doctrine

A starting contract for a React product using owned shadcn components and semantic design tokens. Adapt it to your product before adopting it. Keep the project-specific version in one canonical location.

## 1. One visual source of truth

The shared UI source owns components, compositions, views, shells, and tokens. Record its location and supported import paths in the project's contributor guide.

Design tokens define color, spacing, type, radius, shadows, and sizing. Use the semantic vocabulary consistently. A genuinely missing token is a shared design decision with a real use case and a review of affected consumers.

Do not create a local palette, token aliases, or spacing scale to finish one page.

## 2. Clear component boundaries

| Layer | Responsibility |
| --- | --- |
| Components | Reusable building blocks such as buttons, inputs, tables, and dialogs |
| Compositions | Reusable patterns made from several components |
| Views | Workflow surfaces receiving typed data and callbacks |
| Shells | Application navigation, page width, scrolling, and shared chrome |
| Application | Routing, authentication, data access, mutations, and navigation wiring |

Use the existing component when one covers the behavior. Do not build a button-shaped container or a separate table implementation to avoid reading its API.

These are responsibilities, not a requirement to introduce five new directories or a wrapper for every arrangement. Keep one-off composition local when that is clearer.

## 3. Styling through tokens

Use token-backed utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-input` in a Tailwind project. Expose intentional component variants rather than a large set of arbitrary styling properties.

Use CSS modules or the project's equivalent when complex layout, animation, selectors, or charts become clearer that way. Those styles still resolve through the shared tokens.

Do not add raw color literals, arbitrary utility values such as `p-[13px]`, or deprecated token aliases to ordinary component styling. Token definitions contain the raw values. Keep necessary runtime values, such as measured chart positions, local and explicit.

## 4. Storybook before integration

Build and inspect components, compositions, and substantial views in Storybook before application integration. A story imports the production implementation; it must not duplicate the page's markup into a demonstration that can drift independently.

Use representative data and material states. The application then imports the finished view and passes its data and callbacks.

## 5. Shared page structure

Use the project's shell and page primitives for navigation, content width, scroll ownership, headings, actions, and sections. A new route should not invent a competing page frame.

Choose two or three representative pages as references: a settings form, an overview, and a dense resource table are useful starting points. Record their source and story locations. Keep references tied to production components, and update them as intentional design changes land.

## 6. Density follows the job

For operational software, prioritize scanning, comparison, and repeated use. Tables suit comparable resources. Cards suit bounded summaries, mixed content, focused empty states, and dangerous actions.

Choose typography and spacing for the actual task. Marketing layouts and decorative effects should not displace useful information in a working view. Brand surfaces can have a separate, explicit treatment.

## 7. Interaction and accessibility are part of the design

Verify keyboard access, focus visibility, names and labels, disabled behavior, validation, and loading feedback. Use established accessible primitives and test their composition in the application.

For irreversible resource destruction, show the effect in a focused confirmation surface and require an explicit acknowledgement, such as the exact resource name, before enabling submission. Match the product's approved interaction policy; do not silently change an existing workflow while restyling it.

Preserve entered values on expected failures and show errors where users can act on them.

## 8. A migration needs an explicit boundary

Name the legacy imports and their replacements. Once a component migrates, remove its old public export and restrict the old import. Keep any old implementation needed for comparison isolated from production use.

Do not imitate a grandfathered violation when editing its surrounding code. Resolve the applicable migration in the touched scope. Broader dependency removal is separate from a component cutover.

## 9. Verification has several parts

Types verify contracts. Lint verifies mechanical conventions. Tests verify behavior and composition. Browser inspection and screenshots support visual judgment. None replaces all the others.

Capture each changed view and relevant state in Storybook and the application. The review includes visible evidence, demo instructions, results of checks, and any accepted differences or gaps.

## 10. Rules need working enforcement

Link the design contract from agent entry points that UI work actually reads. Use hooks as reminders where supported. Put mechanical rules in local checks and continuous integration, and verify those checks with a representative violation.

Where legacy allowances are necessary, track them explicitly and fail growth above the checked-in baseline. Review baseline updates so they cannot conceal regressions.

Treat a repeated failure as evidence about the workflow. Check whether the rule was discoverable, actionable, and enforced before adding another instruction.

## 11. Plain product language

Use clear labels, sentence case, active voice, and consistent domain names. Keep numbers compact in dense tables and explain unfamiliar units where they affect a decision. Avoid implementation details in the user flow unless they help the user act.
