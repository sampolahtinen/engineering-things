# Making screenshot comparisons useful

Before and after images should differ because the product changed. Control the environment and capture the intended state before judging the difference.

## Stable data and time

Use fixed synthetic records and anchor fixture timestamps to a known instant. Keep counters, ordering, and selected resources consistent.

Relative-time labels depend on both the stored timestamp and the rendering clock. A fixed seed alone does not fix a label that recalculates the current time. Control the rendering clock where needed, or isolate and label an unavoidable dynamic region.

In Playwright, `page.clock.setFixedTime` fixes `Date` while timers continue to run. Installing and pausing the full clock has different effects; use the mode the application needs. Browser clock control does not affect timestamps formatted on the server. See the [Playwright clock documentation](https://playwright.dev/docs/clock).

Verify clock behavior with interactive overlays before applying it to a whole run. If a clock setup prevents a menu or dialog from settling, capture that interaction with normal time and stable data, and handle unrelated changing labels separately.

## Wait for the state being reviewed

Wait for loaded fonts, required images, and the actual content or explicit state marker. Do not assume navigation completion means that deferred content has rendered. A fixed sleep is a weak substitute for a state assertion.

After opening a dialog, menu, select, or tooltip, wait for the opened surface to become visible. Verify its contents, not just the existence of a trigger or a hidden element in the DOM.

For a loading-state screenshot, use a controlled fixture or request boundary so the state is reproducible. Do not depend on catching a network request at the right millisecond.

## Animation and selectors

Use the capture tool's animation controls to obtain a settled state. Confirm the result visually, especially for portals and positioned overlays. For a motion-specific change, record the interaction separately; a still image cannot verify the whole animation.

Prefer accessible role and name, visible labels, or stable test attributes. Avoid selectors tied to a library's internal classes or markup during a migration. Disambiguate repeated labels using their containing view or dialog rather than choosing the first match blindly.

## Match the environment

Keep viewport, device scale, theme, browser version, operating environment, locale, and fonts consistent. Store those settings with the capture configuration. Baselines from another platform may need review even when the code has not changed.

Hide development-only controls only through an explicit capture rule. Do not hide product alerts, errors, overflowing text, or loading indicators that belong to the changed view. Document any masked region.

## Honest comparisons

Record which revision produced each side. Never replace an old baseline merely to make a failing assertion pass. Inspect the difference and explain whether it is a regression or an intentional design decision.

Where the old state cannot be reproduced, provide after-only evidence and state the gap. Where a transient state is covered in Storybook instead, label it as story evidence. Neither substitutes for application interaction verification.
