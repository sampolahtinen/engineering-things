# Screenshot evidence for UI pull requests

The agent prepares and verifies the change; the reviewer judges the result. Screenshots make visual review possible alongside code and test evidence.

## Capture the changed surface

List each changed view and the states needed to review it. Capture the final state and relevant empty, loading, error, disabled, responsive, and theme states. For dialogs, menus, tooltips, and selects, capture the opened surface as well as any surrounding context that matters.

One screenshot does not cover another changed view. A screenshot of a trigger does not establish that the interaction works.

Use consistent data, viewport, theme, and browser settings for before/after comparisons. Record the revisions captured. If a before image is unavailable, label the result as after-only evidence.

## Make images available to the reviewer

Use the project's approved image host. Embed the images in the pull request body; a local file path or an upload placeholder does not provide reviewable evidence.

One option is a dedicated `agent-pr-assets` branch in the same GitHub repository. It holds images and is never merged into the application branch. An authorized agent can upload an image through the GitHub repository contents API:

1. Resolve the repository and default branch from the current checkout.
2. Find the assets branch, or create it from a known commit when authorized.
3. Choose a unique path containing the PR number, revision, view, and state.
4. Base64-encode the image and send a structured JSON request to `PUT /repos/{owner}/{repo}/contents/{path}`, with `message`, `content`, and `branch` fields.
5. Prefer a new path for each capture. Updating an existing path also requires its current blob `sha`; serialize writes and handle conflicts rather than overwriting another upload blindly.
6. Embed a blob URL pinned to the returned commit: `https://github.com/OWNER/REPO/blob/COMMIT/PATH?raw=true`.
7. Verify the upload succeeded and the intended reviewer can open the image.

The API contract is documented in [GitHub's repository contents reference](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents). Use an already configured authenticated client; never paste access tokens into commands, captions, or PR text.

Repository visibility applies to its assets too. Use synthetic data. Private repository images need an appropriate public destination if they are later selected for a public article. This guide supplies a procedure, not an upload script or permission to publish.

## What the pull request contains

| Item | Required information |
| --- | --- |
| Change | What the user sees or can do differently |
| Demo | Direct route or preview link, required test state, steps, and expected result |
| Evidence | Embedded images labeled by view, state, and theme |
| Comparison | Before and after where available, with revisions and intentional differences |
| Verification | Checks actually run and their results |
| Gaps | Views, interactions, or checks not verified and why |

Example review note:

> The settings dialog now keeps validation errors beside the field. The screenshots show the default, invalid, and submitting states in both supported themes. Open the settings preview, choose Rename, and submit an empty value to reproduce the error. The unchanged page has no before capture; its image is after-only evidence.

Do not call screenshots proof of functional correctness. Keep keyboard, submission, permission, and failure-path verification appropriate to the change.
