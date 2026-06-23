# Issue Backlog: OpenCode Telegram Bridge

## Status Legend

- `Not started`: no implementation work has begun.
- `In progress`: implementation has started but acceptance criteria are not complete.
- `Blocked`: waiting on a dependency or decision.
- `Done`: acceptance criteria are complete and verified.

## Current Status

- Overall: `Done`
- Active issue: None
- Last updated: 2026-06-16

## Issue 1: Scaffold Bun workspace and shared core

Status: `Done`

Type: AFK

Blocked by: None - can start immediately

User stories covered: 4, 5, 6, 7, 8, 11, 25, 26, 27

### What to build

Create the Bun workspace foundation and shared core package used by both bridges. The core package should provide Telegram API calls, threaded notifications, forum topic creation, permission buttons, tool formatting, and shared types.

### Acceptance criteria

- [x] Root workspace metadata is present for a Bun monorepo.
- [x] Strict TypeScript configuration is present with an `@core` path alias.
- [x] The core package exposes Telegram helpers for raw bot API calls, threaded notifications, forum topic creation, and permission buttons.
- [x] Permission buttons send allow and deny callback data using the required callback format.
- [x] Tool formatting handles `write`, `edit`, `bash`, `read`, and default tools as specified.
- [x] Bash command summaries are truncated to 80 characters.
- [x] Core code uses native `fetch` only.

## Issue 2: Implement local bridge remote mode

Status: `Done`

Type: AFK

Blocked by: Issue 1

User stories covered: 1, 2, 3, 13

### What to build

Implement the OpenCode plugin entry point for local TUI remote mode. `/remote on` should create a Telegram topic, remember the active session/thread mapping, notify that remote mode is active, and start long polling. `/remote off` should stop polling and notify the thread.

### Acceptance criteria

- [x] The local bridge exports a single plugin function named `TelegramBridge`.
- [x] `/remote on` creates a forum topic and stores the active session and thread IDs.
- [x] `/remote on` sends `📡 Remote mode active` to the created thread.
- [x] `/remote on` starts Telegram long polling with `timeout=30`.
- [x] Plain text replies in the active Telegram thread are injected into the active OpenCode session.
- [x] `/remote off` stops polling and sends `📴 Remote mode off`.
- [x] Telegram and OpenCode errors are logged without crashing the polling loop.

## Issue 3: Stream local session events and permissions to Telegram

Status: `Done`

Type: AFK

Blocked by: Issue 2

User stories covered: 4, 5, 6, 7, 8, 9, 10, 11, 12

### What to build

Complete local bridge event handling for tool results, session idle, session errors, and permission approvals. Tool notifications should use shared formatting. Permission requests should show Telegram inline buttons and callbacks should be routed back to the correct session permission endpoint.

### Acceptance criteria

- [x] `tool.execute.after` sends formatted tool notifications for the active session.
- [x] Tool events whose formatter returns `null` are skipped.
- [x] `session.idle` sends `✅ Idle — your turn`.
- [x] `session.error` sends `❌ Error: <message>`.
- [x] `permission.asked` sends allow and deny buttons.
- [x] Permission callbacks parse the action and permission ID from Telegram callback data.
- [x] Permission callbacks call the OpenCode permission action endpoint for the mapped session.
- [x] Callback queries are answered so Telegram dismisses the spinner.
- [x] Errors in event handling are logged without crashing the plugin.

## Issue 4: Implement cloud bridge command loop

Status: `Done`

Type: AFK

Blocked by: Issue 1

User stories covered: 14, 15, 16, 17, 18, 19, 20, 23

### What to build

Implement the standalone Bun cloud bridge process that connects to OpenCode through the SDK and handles Telegram commands through long polling. The command loop should support starting sessions, listing sessions, attaching to sessions, and injecting thread replies back into attached sessions.

### Acceptance criteria

- [x] The cloud bridge creates an OpenCode SDK client from `OPENCODE_URL`.
- [x] Telegram long polling uses `getUpdates` with `timeout=30`.
- [x] `/agent start <prompt>` creates a session titled from the prompt.
- [x] `/agent start <prompt>` creates a Telegram topic named from the prompt.
- [x] `/agent start <prompt>` stores session-to-thread and thread-to-session mappings.
- [x] `/agent start <prompt>` sends `🚀 Started` and injects the prompt into the OpenCode session.
- [x] `/agent list` sends a top-level numbered list of sessions with title and status.
- [x] `/agent attach <number>` binds Telegram to the selected existing session.
- [x] Attaching an already-bound session notifies the existing thread instead of creating a duplicate topic.
- [x] Plain text in an attached thread is injected into the mapped OpenCode session.
- [x] The cloud bridge remains outbound-only and does not start an HTTP server.
- [x] Telegram and OpenCode errors are logged without crashing the polling loop.

## Issue 5: Stream cloud session events, permissions, and keepalive

Status: `Done`

Type: AFK

Blocked by: Issue 4

User stories covered: 21, 22, 24

### What to build

Complete cloud bridge session subscription behavior and Prisma Compute keepalive handling. Session subscriptions should stream relevant OpenCode events to each Telegram thread without blocking the polling loop. The process should acquire and release `KeepAwakeGuard` around the polling loop and restart across the 24-hour safety ceiling.

### Acceptance criteria

- [x] `subscribeToSession` uses OpenCode event subscription in an async loop.
- [x] Subscription handling filters events by session ID.
- [x] `session.idle` sends `✅ Idle — your turn` to the mapped thread.
- [x] `session.error` sends `❌ Error: <msg>` to the mapped thread.
- [x] `tool.execute.after` sends shared formatted tool notifications and skips `null` results.
- [x] `permission.asked` stores permission-to-session mapping and sends allow/deny buttons.
- [x] Permission callback queries look up the session from the permission map and call the OpenCode permission action endpoint.
- [x] Callback queries are answered so Telegram dismisses the spinner.
- [x] The cloud bridge depends on `@prisma/compute`.
- [x] The polling loop is wrapped in `KeepAwakeGuard` acquisition and release.
- [x] The guarded polling loop restarts after the 24-hour safety signal fires.
- [x] Subscription, Telegram, OpenCode, and keepalive errors are logged without crashing the outer bridge process.

## Issue 6: Document setup, operation, and deployment

Status: `Done`

Type: AFK

Blocked by: Issues 1, 2, 3, 4, 5

User stories covered: 28

### What to build

Write the README that explains how to configure Telegram, run the cloud bridge on Prisma Compute, install the local bridge plugin, and use the supported commands.

### Acceptance criteria

- [x] README explains how to create a Telegram bot through BotFather.
- [x] README explains how to enable topics in the private Telegram group.
- [x] README explains how to obtain and configure `TG_BOT_TOKEN`, `TG_GROUP_ID`, and `OPENCODE_URL`.
- [x] README documents Prisma Compute deployment commands.
- [x] README documents local bridge installation by symlink or copy into OpenCode plugins.
- [x] README documents `/remote on` and `/remote off` usage.
- [x] README documents `/agent start`, `/agent list`, and `/agent attach` usage.
- [x] README explains that cloud bridge uses `KeepAwakeGuard` to prevent Prisma Compute sleep during polling.
- [x] README states that the system uses Telegram long polling, not webhooks.
- [x] README states that cloud bridge is outbound-only and runs no HTTP server.

## Dependency Order

1. Issue 1: Scaffold Bun workspace and shared core
2. Issue 2: Implement local bridge remote mode
3. Issue 3: Stream local session events and permissions to Telegram
4. Issue 4: Implement cloud bridge command loop
5. Issue 5: Stream cloud session events, permissions, and keepalive
6. Issue 6: Document setup, operation, and deployment

## Progress Notes

- 2026-06-16: Backlog created from the initial task brief.
- 2026-06-16: Implementation completed. `bun test` and `bun run typecheck` pass.
