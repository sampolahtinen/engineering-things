---
name: write-ui
description: Builds and verifies product UI through the project's design system, Storybook, and screenshot evidence. Use for new components, page layouts, forms, dialogs, tables, restyling, and bug fixes that touch route markup or CSS, even when the task did not start as design work.
---

# Write UI

Build a reviewable UI change using the project's actual components and design rules.

## Establish the project contract

Read the nearest agent instructions and the project's canonical design document. If it has none, use [design-doctrine.md](references/design-doctrine.md) as a proposal, and settle missing design choices before changing shared defaults. Local policy takes precedence over this template.

Find the UI source, token definitions, supported themes, representative pages, Storybook configuration, and existing verification commands. Use actual paths and scripts; do not assume a monorepo, package manager, component prefix, or browser tool. Do not install or change project infrastructure merely to make a command in a skill work.

## Review requirements

1. Use existing components before creating new ones. Verify their properties in current documentation, examples, or exported types.
2. Follow the token policy. Do not copy deprecated tokens or legacy imports from the surrounding file. If a migration is active, use the approved replacement in the touched scope.
3. Build reusable components, compositions, and views in Storybook before wiring them into the application. Stories render the real implementation with representative data.
4. Inspect rendered output in both Storybook and the application. Documentation output and a successful build do not establish visual correctness.
5. Capture every changed view and the material states needed for review. A screenshot of one page does not cover another; a closed dialog does not show its contents.
6. Run the project's required checks and report their results. Name any unavailable verification instead of claiming completion.

## Workflow

### 1. Inspect and scope

Identify the user-visible change, affected views, and states. Read a representative page before choosing the layout. For a visual reference, record the theme and viewport and inspect the source artifact before implementing it.

If the design-to-code skill is installed, use it for reference comparison. Otherwise compare the reference with the rendered implementation at the same viewport, correct mismatches, and report intentional differences.

### 2. Discover components

Start the project's Storybook instance. When its Model Context Protocol (MCP) server is available, discover its tools and component catalog, read the relevant documentation and story examples, and obtain preview URLs. Tool names vary; use the tools the instance actually exposes.

If MCP is unavailable, inspect source types and stories directly. Do not broaden a component API to support an invented property. An API/documentation mismatch is a finding to resolve in the touched scope.

### 3. Choose the smallest suitable layer

- Reuse an existing component or composition when it covers the behavior.
- Keep a small one-off arrangement local when a new abstraction adds no value.
- Put a reusable multi-component pattern in a composition with stories.
- Put a substantial workflow surface in a view with typed inputs and callbacks.
- Add a missing primitive using the project's established source or generator. In a shadcn project, generate it with the configured CLI and adapt it to local tokens.

Application code supplies data, navigation, authentication, and mutations. Keep those dependencies out of presentation views where the project contract requires it.

### 4. Build and inspect in Storybook

Render the production component with realistic content lengths, loading, empty, error, and disabled states where relevant. Include supported themes and meaningful viewport changes. Keep fixtures in stories rather than production logic.

Open the story in the browser and confirm both the Storybook interface and canvas loaded. Inspect spacing, hierarchy, focus, overflow, and interactions. Capture screenshots early, correct visible defects, and repeat. Do not submit a blank canvas or documentation page as visual evidence.

### 5. Integrate and verify

Wire the component or view into the application. Verify the relevant interactions and real data shape in an authorized local or preview environment. Use synthetic data for shared evidence. Run formatting, types, lint, affected tests, and story checks supported by the project.

For repeatable route comparisons, use the screenshot-routes skill if installed, or the project's existing browser tests. For a single visual check, use the configured interactive browser tool.

### 6. Prepare the review

Follow [pr-screenshots.md](references/pr-screenshots.md). Include embedded images, a direct demo path, reproduction steps, verification results, accepted differences, and missing coverage. Publish only within the authorization for the task; preparing evidence does not itself authorize a remote write.

## Example task

> Add a delete-confirmation dialog to this settings view. Use our existing dialog and form components, demonstrate the disabled and error states in Storybook, then connect the action. Bring screenshots of the open dialog and the integrated page, with the checks you ran.
