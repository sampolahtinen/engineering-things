# PRD: OpenCode Telegram Bridge

## Problem Statement

OpenCode sessions currently require the operator to stay near the local TUI or a cloud agent console to see progress, respond when a session becomes idle, and approve permissions. This makes long-running work hard to supervise from mobile and makes cloud-hosted agent sessions awkward to control without opening a terminal.

The operator needs a Telegram bridge that can route OpenCode session activity into a private Telegram group with topics, accept human replies back into the correct session, and handle permission approval through inline buttons.

## Solution

Build a TypeScript Bun monorepo named `opencode-telegram` with three packages:

- `core`: shared Telegram API utilities, tool formatting, and common types.
- `local-bridge`: an OpenCode plugin that connects the local TUI session to a Telegram topic when `/remote on` is executed.
- `cloud-bridge`: a standalone outbound-only Bun process that creates and controls OpenCode SDK sessions from Telegram commands.

Both bridge packages use Telegram long polling, not webhooks. The cloud bridge uses Prisma Compute's `KeepAwakeGuard` while the polling loop is active so it does not sleep mid-session.

## User Stories

1. As an OpenCode operator, I want to start remote mode from the local TUI, so that I can supervise a local session from Telegram.
2. As an OpenCode operator, I want `/remote on` to create a dedicated Telegram topic, so that session messages stay grouped.
3. As an OpenCode operator, I want `/remote off` to stop Telegram polling for the local bridge, so that I can return control to the local TUI.
4. As an OpenCode operator, I want write tool events to show the written file path, so that I can understand meaningful file changes remotely.
5. As an OpenCode operator, I want edit tool events to show the edited file path, so that I can track modifications without opening the repo.
6. As an OpenCode operator, I want bash tool events to show the command, so that I can understand process execution from Telegram.
7. As an OpenCode operator, I want read tool events skipped, so that Telegram is not flooded with low-value noise.
8. As an OpenCode operator, I want unknown tool events displayed generically, so that important activity is not silently hidden.
9. As an OpenCode operator, I want idle events sent to Telegram, so that I know when the agent is waiting for my turn.
10. As an OpenCode operator, I want session error events sent to Telegram, so that failures are visible immediately.
11. As an OpenCode operator, I want permission requests rendered as allow and deny buttons, so that I can approve or reject them from Telegram.
12. As an OpenCode operator, I want permission callbacks routed to the session that asked, so that approvals affect the correct session.
13. As an OpenCode operator, I want Telegram replies inside a session topic injected back into OpenCode, so that I can continue the conversation remotely.
14. As a cloud bridge operator, I want `/agent start <prompt>` to create a new OpenCode session, so that I can launch cloud agent work from Telegram.
15. As a cloud bridge operator, I want each cloud session to get its own Telegram topic, so that parallel sessions stay separated.
16. As a cloud bridge operator, I want the initial prompt sent into the new session automatically, so that `/agent start` is one action.
17. As a cloud bridge operator, I want `/agent list` to show numbered sessions with title and status, so that I can choose an existing session.
18. As a cloud bridge operator, I want `/agent attach <number>` to bind Telegram to an existing session, so that I can resume work without creating a duplicate.
19. As a cloud bridge operator, I want attaching an already-bound session to notify the existing thread, so that I avoid duplicate topics.
20. As a cloud bridge operator, I want plain text in an attached thread injected into that session, so that Telegram becomes the control surface.
21. As a cloud bridge operator, I want session event subscriptions to stream tool, idle, error, and permission events, so that session progress is visible after startup.
22. As a cloud bridge operator, I want polling errors logged but not fatal, so that transient Telegram or OpenCode failures do not kill the bridge.
23. As a cloud bridge operator, I want the bridge to use outbound polling only, so that no public HTTP server or webhook is required.
24. As a cloud bridge operator, I want Prisma Compute keepalive protection, so that active long polling is not interrupted by instance sleep.
25. As a maintainer, I want shared Telegram and formatting behavior in the core package, so that local and cloud bridges behave consistently.
26. As a maintainer, I want strict TypeScript configuration, so that integration mistakes are caught early.
27. As a maintainer, I want Bun workspaces, so that all packages can be installed and run consistently.
28. As a maintainer, I want clear README setup instructions, so that a new operator can create the bot, configure topics, and run either bridge.

## Implementation Decisions

- The repo is a Bun workspace monorepo with packages for shared core behavior, a local OpenCode plugin, and a standalone cloud bridge.
- The core package owns Telegram Bot API access through native `fetch` and does not depend on `node-fetch` or an HTTP framework.
- Telegram notification helpers require a group ID and thread ID for threaded messages.
- Topic creation uses Telegram forum topics and returns the `message_thread_id` used by later notifications.
- Permission messages use inline keyboard callback data in the form `allow:<permissionId>` and `deny:<permissionId>`.
- Tool formatting is intentionally small and explicit: `write`, `edit`, `bash`, `read`, and a generic default.
- Bash command display truncates to 80 characters before being sent to Telegram.
- Local bridge state is module-level because OpenCode loads the plugin in-process and the bridge only tracks the active local remote session.
- Cloud bridge state is process-level because it owns multiple OpenCode SDK sessions and Telegram thread mappings.
- Both bridges use Telegram `getUpdates` long polling with `timeout=30`.
- Neither bridge uses webhooks, Express, or any inbound HTTP server.
- All Telegram and OpenCode calls are wrapped in `try/catch`, logged with `console.error`, and must not crash the polling loop.
- The local bridge exports a single OpenCode plugin function named `TelegramBridge`.
- The local bridge creates a Telegram topic and starts polling when `/remote on` is executed.
- The local bridge stops polling when `/remote off` is executed.
- The local bridge injects Telegram text replies from the active thread into the active OpenCode session.
- The cloud bridge creates its own SDK client from `OPENCODE_URL`.
- The cloud bridge supports `/agent start`, `/agent list`, `/agent attach`, plain threaded replies, and permission callbacks.
- The cloud bridge subscribes to session events in non-blocking tasks so Telegram polling remains responsive.
- The cloud bridge acquires a `KeepAwakeGuard` while polling and releases it on exit.
- The cloud bridge restarts the guarded polling loop when the guard's 24-hour safety signal fires.
- No UI is implemented.

## Testing Decisions

- Prefer TypeScript strictness first: shared types should make Telegram callback actions, thread IDs, session IDs, and permission IDs explicit enough to reduce runtime mistakes.
- Core formatting should have focused unit tests because it is deterministic and shared by both bridges.
- Telegram helpers should be tested by stubbing `fetch` at the public function boundary, not by testing internal helper details.
- Bridge polling behavior should be tested at the highest feasible seam by injecting representative Telegram updates and OpenCode events where the package design allows it.
- Manual verification remains necessary for real Telegram topics, inline keyboards, BotFather setup, private group IDs, and Prisma Compute keepalive behavior.
- README instructions should be treated as part of the deliverable because setup correctness is essential for this integration.

## Out of Scope

- No browser or mobile UI beyond Telegram messages and buttons.
- No Telegram webhooks.
- No Express, Fastify, or other inbound HTTP server.
- No database persistence for session/thread mappings.
- No multi-tenant authorization model beyond the configured private Telegram group.
- No custom Telegram command menu setup.
- No build pipeline beyond Bun running TypeScript directly.
- No npm workspace setup.

## Further Notes

- The first implementation pass should follow the requested package order: core, local bridge, cloud bridge.
- The local bridge and cloud bridge share the core package but intentionally keep separate state because their runtime models differ.
- The issue backlog in `docs/issues.md` is the status tracker for implementation progress.
