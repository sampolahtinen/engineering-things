---
name: screenshot-routes
description: Maps application routes and interactions, captures repeatable screenshots, and prepares visual comparison evidence. Use when asked to screenshot routes, create a visual baseline, compare before and after, or verify the screens affected by a component migration.
---

# Screenshot routes

Produce evidence for the actual changed surface. Read [capture-recipe.md](references/capture-recipe.md) before creating a capture run.

## 1. Choose the requested mode

- Baseline only: capture the requested unchanged state. Do not make implementation changes or invent an after comparison.
- Changed component: trace its consumers through shared compositions to the routes that render it.
- Route set: inspect the specified routes, or enumerate the router when the request covers the application.

Use the project's existing browser setup. Prefer an interactive browser tool for one-off inspection and Playwright Test for repeatable batches or regression assertions. Do not add a new testing framework when an existing one covers the task.

## 2. Build a route and state map

Record route, test data, viewport, theme, interaction, and expected visible result. Classify each capture as static, interaction required, or story-only. Use source, actual routing, and shared consumers to establish coverage; a single text search is insufficient.

Show uncertain coverage decisions before running an expensive batch. Resolve available details from the repository rather than asking for information that is already documented.

| Example surface | Capture mode | Evidence |
| --- | --- | --- |
| Resource table | Static | Loaded and empty states |
| Rename dialog | Interaction required | Dialog open, invalid input, submitting state where reproducible |
| Brief toast | Story-only if not stable in the app | Rendered story, with the route coverage gap stated |

## 3. Prepare a repeatable environment

Identify the boot command, local or preview authentication, synthetic fixtures, and any time-dependent rendering. Use the same browser, viewport, scale, fonts, and theme for both sides.

Wait for specific visible content and loaded fonts rather than a fixed delay. Follow the capture recipe for time, animation, and overlays. Do not hide the product state being reviewed to obtain a clean image.

## 4. Capture the baseline

Capture the before images from the intended unchanged revision and record that revision. Use separate checkouts when both versions must run at once, within the task's authorization. Store images in the project's established baseline location.

If the request is baseline-only, report the captured coverage and stop here. Do not commit files or upload them unless the task authorizes it.

## 5. Capture and compare the changed state

Capture all mapped application states that can be reproduced. Keep story-only rows explicit. Do not narrow the run to one benchmark route or only the images expected to change.

If Playwright screenshot assertions are already configured, compare against the recorded baseline. Inspect generated differences before changing expectations. A component migration may deliberately differ; record accepted changes and seek the review required by the project rather than treating a changed baseline as proof of correctness.

If there is no before image, report after-only evidence. Do not reconstruct a before image from the new implementation.

## 6. Prepare the review report

Create a table containing view, state, theme, before image, after image, optional difference image, and outcome. Record source revisions, environment, skipped captures, and reasons. Keep visual outcomes such as unchanged, intentional difference, and needs review distinct from functional test results.

Upload through the project's approved process when authorized, then embed links reviewers can open. If images remain local, say they are local and give their location; do not claim the PR evidence is published.

## Example task

> Compare the routes affected by replacing our Button. Trace shared component consumers, capture the before and after with the same fixtures, include disabled and loading states where they matter, and distinguish missing baselines from passing comparisons.
