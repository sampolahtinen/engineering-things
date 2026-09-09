---
name: design-to-code
description: Translates visual references into production UI through component discovery, Storybook implementation, and screenshot comparison. Use when implementing a mockup, design bundle, prototype, or screenshot, including output from Claude Design or v0.
---

# Design to code

Implement a visual reference using the project's real components and design contract. Treat generated templates as source material for understanding the design.

## 1. Establish the reference

Identify the exact artifact, target surface, viewport, theme, and intended behavior. Read any accompanying README, component inventory, design notes, and interface definitions. Inspect the reference visually before editing code.

Read the project's design rules and current tokens. If a rule and the reference disagree, identify the concrete conflict. Follow the already agreed direction or ask the engineer to decide before changing shared design choices.

## 2. Separate the design into useful parts

Identify the components, compositions, view, and shell involved. Work on the smallest part that can be implemented and verified independently. Do not introduce reusable abstractions for one-off details without a clear reason.

For that part, record its visible requirements: dimensions, spacing, type, hierarchy, active and disabled states, borders, icons, and content density. Record deliberate exclusions so an agent does not expand a sidebar task into a whole-page redesign.

## 3. Discover the production building blocks

Read the project's component catalog and story examples. If the running Storybook instance provides Model Context Protocol (MCP) tools, discover and use its actual tools for documentation and preview URLs. Otherwise inspect component source and stories directly.

Verify properties from documentation or exported types. Do not assume an API based on another library or add a property solely to make a copied template compile.

Use the existing icon system. Add a missing primitive through the project's established generator or source, then adapt it to the approved tokens and component conventions.

## 4. Build the component and its story

Build the production implementation first and import it into the story. Keep example data in fixtures or the story. Avoid a story-only wrapper that hides missing production behavior.

Render the component in the real application shell when context affects the design. Implement representative content, important states, supported themes, and responsive behavior before integrating routing and data access.

## 5. Compare rendered output

Open the Storybook preview in a browser and confirm that the story rendered. Reading documentation or obtaining a preview URL is not visual verification.

Capture the reference and implementation at matching dimensions. Compare hierarchy, spacing, type, geometry, icons, contrast, and state behavior. Use side-by-side images and browser measurements where they resolve uncertainty.

Correct concrete mismatches and repeat. A screenshot comparison does not require recreating every old pixel: list intentional differences and their rationale. Do not describe a close result as exact parity.

If a visual audit tool is already available, use it to identify specific improvements within the agreed design. Keep broader redesigns or changes to shared tokens and defaults explicit; follow the project's approval policy.

## 6. Integrate and hand off

Connect the verified component to the application with its real data shape and interactions. Recheck the integrated view; Storybook does not verify routing, permissions, or server behavior.

Run the project's actual format, type, lint, story, and affected test commands. Include rendered screenshots, a reproducible demo, verification results, and remaining differences in the review. An unavailable browser or check is a stated gap, not a successful verification.

If write-ui is installed, use it for the broader delivery workflow. This skill can run on its own using the project contract and the requirements above.

## Example task

> Implement the resource table from this design. First identify the existing table, menu, badge, and pagination components. Build the actual view in Storybook, compare its dense and empty states with the reference, and report any intentional differences before connecting live data.
