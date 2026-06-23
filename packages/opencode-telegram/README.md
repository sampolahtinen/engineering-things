# opencode-telegram

Bridge OpenCode sessions to Telegram topics.

This repo contains two bridges that share a small core package:

- `@opencode-telegram/core`: Telegram Bot API helpers and OpenCode tool formatting.
- `@opencode-telegram/local-bridge`: OpenCode plugin for a local TUI session.
- `@opencode-telegram/cloud-bridge`: standalone outbound-only bridge for an OpenCode SDK server.

## Requirements

- Bun
- A Telegram bot token
- A private Telegram group with topics enabled
- OpenCode
- Prisma Compute for cloud deployment

## Telegram Setup

1. Create a bot with BotFather and copy the bot token.
2. Create a private Telegram group.
3. Enable topics for the group.
4. Add the bot to the group.
5. Get the group ID. Telegram group IDs are usually negative numbers.
6. Configure the environment variables below.

## Environment

All packages use:

```sh
TG_BOT_TOKEN=your-telegram-bot-token
TG_GROUP_ID=-1001234567890
```

The cloud bridge also uses:

```sh
OPENCODE_URL=http://100.x.x.x:4096
```

## Install

```sh
bun install
```

## Test

```sh
bun test
bun run typecheck
```

## Local Bridge

Install the OpenCode plugin by symlinking the local bridge entry file:

Plugin path:

```text
~/.config/opencode/plugins/telegram-bridge.ts
```

```sh
mkdir -p ~/.config/opencode/plugins
ln -s "$(pwd)/packages/local-bridge/index.ts" ~/.config/opencode/plugins/telegram-bridge.ts
```

Use a symlink rather than a plain copy because the plugin imports the shared core package by relative path. Source edits in this repo update the plugin file path automatically through the symlink, but OpenCode still needs a restart because plugins are loaded only at startup.

If the symlink already exists and points somewhere else, replace it:

```sh
rm ~/.config/opencode/plugins/telegram-bridge.ts
ln -s "$(pwd)/packages/local-bridge/index.ts" ~/.config/opencode/plugins/telegram-bridge.ts
```

Start OpenCode with the Telegram environment variables available to the OpenCode process:

```sh
export TG_BOT_TOKEN='your_bot_token'
export TG_GROUP_ID='-1001234567890'
opencode
```

If you keep those values in a local `.env` file, load it before starting OpenCode:

```sh
set -a
source .env
set +a
opencode
```

Restart OpenCode after installing or changing the plugin. OpenCode loads plugins only at startup.

Register command files so `/remote-on` and `/remote-off` appear in the TUI command picker:

```text
~/.config/opencode/commands/remote-on.md
~/.config/opencode/commands/remote-off.md
```

Install them as symlinks so source changes in this repo update OpenCode's command files automatically:

```sh
mkdir -p ~/.config/opencode/commands
ln -s "$(pwd)/packages/local-bridge/commands/remote-on.md" ~/.config/opencode/commands/remote-on.md
ln -s "$(pwd)/packages/local-bridge/commands/remote-off.md" ~/.config/opencode/commands/remote-off.md
```

`remote-on.md`:

```markdown
---
description: Enable the Telegram local bridge
---
```

`remote-off.md`:

```markdown
---
description: Disable the Telegram local bridge
---
```

The command files intentionally have empty bodies. The plugin handles OpenCode's `command.execute.before` hook to enable or disable remote mode and ignores `command.executed` to avoid duplicate Telegram topics.

Do not use shell-output command snippets for these commands. OpenCode command shell output is injected into the prompt, and a separate shell process cannot access the plugin's active session state.

In the OpenCode TUI:

```text
/remote-on
```

This creates a Telegram topic, announces remote mode, and starts Telegram long polling.

To stop remote mode:

```text
/remote-off
```

## Cloud Bridge

Run locally:

```sh
bun packages/cloud-bridge/index.ts
```

Use Telegram commands:

```text
/agent start <prompt>
/agent list
/agent attach <number>
```

Plain text sent inside an attached session topic is forwarded to that OpenCode session.

Permission requests are sent with inline buttons:

```text
✅ Allow
❌ Deny
```

## Prisma Compute

Deploy with:

```sh
npx @prisma/cli@latest auth login
npx @prisma/cli@latest app deploy
```

The cloud bridge acquires a Prisma Compute keepalive guard at startup so the Compute instance does not sleep while the Telegram polling loop is active. The guard is bounded by a 24-hour safety signal; when that signal fires, the bridge releases the guard and starts a new guarded polling loop.

The current `@prisma/compute` package exports `ScaleToZeroGuard`, so the cloud bridge imports it under the requested `KeepAwakeGuard` name.

## Network Model

The bridges use Telegram long polling through `getUpdates` with `timeout=30`.

There are no webhooks, no Express app, and no inbound HTTP server in the cloud bridge. All communication is outbound.
