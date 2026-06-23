import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { TelegramBridge } from "../index"

const originalFetch = globalThis.fetch
const calls: Array<{ body: unknown; url: string }> = []

beforeEach(() => {
  calls.length = 0
  process.env.TG_BOT_TOKEN = "token"
  process.env.TG_GROUP_ID = "-100"
  globalThis.fetch = (async (url, init) => {
    calls.push({ body: JSON.parse(String(init?.body)), url: String(url) })
    return new Response(JSON.stringify({ ok: true, result: { message_thread_id: 42 } }))
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.TG_BOT_TOKEN
  delete process.env.TG_GROUP_ID
})

describe("TelegramBridge local plugin", () => {
  test("/remote on creates a Telegram thread and announces remote mode", async () => {
    const hooks = await TelegramBridge(
      { client: { session: { get: async () => ({ title: "Implement Telegram bridge" }) } } } as never,
      { poll: false },
    )
    const output = { parts: [] }

    await hooks["command.execute.before"]?.({ command: "remote-on", sessionID: "session-1" }, output)

    expect(output.parts).toEqual([])
    expect(calls[0]?.body).toEqual({ chat_id: "-100", name: "Implement Telegram bridge" })
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.telegram.org/bottoken/createForumTopic",
      "https://api.telegram.org/bottoken/sendMessage",
    ])
    expect(calls[1]?.body).toMatchObject({
      message_thread_id: 42,
      text: "📡 Remote mode active",
    })
  })

  test("tool events for the active session are formatted into the active thread", async () => {
    const hooks = await TelegramBridge({ client: { session: { get: async () => ({ title: "Session" }) } } } as never, { poll: false })

    await hooks["command.execute.before"]?.({ command: "remote-on", sessionID: "session-1" })
    await hooks["tool.execute.after"]?.({ session: { id: "session-1" }, tool: "write", args: { filePath: "src/app.ts" } })

    expect(calls.at(-1)?.body).toMatchObject({
      message_thread_id: 42,
      text: "📝 Wrote `src/app.ts`",
    })
  })

  test("command.executed events do not create duplicate remote topics", async () => {
    const hooks = await TelegramBridge({ client: {} } as never, { poll: false })

    await hooks.event?.({
      event: {
        properties: { arguments: "", name: "remote-on", sessionID: "session-1" },
        type: "command.executed",
      },
    })

    expect(calls).toEqual([])
  })

  test("permission.ask sends Telegram permission buttons for OpenCode permission input", async () => {
    const hooks = await TelegramBridge(
      { client: { session: { get: async () => ({ title: "Permission session" }) } } } as never,
      { poll: false },
    )

    await hooks["command.execute.before"]?.({ command: "remote-on", sessionID: "session-1" })
    calls.length = 0
    await hooks["permission.ask"]?.({
      id: "perm-1",
      metadata: { pattern: "/tmp/*" },
      sessionID: "session-1",
      title: "Access external directory ~/.config/opencode",
      type: "external_directory",
    })

    expect(calls[0]?.body).toMatchObject({
      message_thread_id: 42,
      reply_markup: {
        inline_keyboard: [
          [
            { callback_data: "allow:perm-1", text: "✅ Allow" },
            { callback_data: "deny:perm-1", text: "❌ Deny" },
          ],
        ],
      },
    })
  })

  test("permission.updated events send Telegram permission buttons once", async () => {
    const hooks = await TelegramBridge(
      { client: { session: { get: async () => ({ title: "Permission event session" }) } } } as never,
      { poll: false },
    )

    await hooks["command.execute.before"]?.({ command: "remote-on", sessionID: "session-1" })
    calls.length = 0
    const event = {
      event: {
        properties: {
          id: "perm-event-1",
          metadata: { pattern: "/tmp/*" },
          sessionID: "session-1",
          title: "Access external directory ~/.config/opencode",
          type: "external_directory",
        },
        type: "permission.updated",
      },
    }

    await hooks.event?.(event)
    await hooks.event?.(event)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.body).toMatchObject({
      message_thread_id: 42,
      reply_markup: {
        inline_keyboard: [
          [
            { callback_data: "allow:perm-event-1", text: "✅ Allow" },
            { callback_data: "deny:perm-event-1", text: "❌ Deny" },
          ],
        ],
      },
    })
  })
})
