import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { createThread, notify, sendPermissionButtons, tg } from "../telegram"

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

describe("Telegram helpers", () => {
  test("tg calls the Telegram Bot API with JSON", async () => {
    await tg("sendMessage", { text: "hello" })

    expect(calls).toEqual([
      {
        body: { text: "hello" },
        url: "https://api.telegram.org/bottoken/sendMessage",
      },
    ])
  })

  test("notify sends a message into a thread", async () => {
    await notify(42, "hello")

    expect(calls[0]?.body).toEqual({
      chat_id: "-100",
      message_thread_id: 42,
      parse_mode: "Markdown",
      text: "hello",
    })
  })

  test("createThread returns the created forum topic thread id", async () => {
    await expect(createThread("agent work")).resolves.toBe(42)
    expect(calls[0]?.body).toEqual({ chat_id: "-100", name: "agent work" })
  })

  test("sendPermissionButtons sends allow and deny callbacks", async () => {
    await sendPermissionButtons(42, "perm-1", "bash", { command: "ls" })

    expect(calls[0]?.body).toEqual({
      chat_id: "-100",
      message_thread_id: 42,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { callback_data: "allow:perm-1", text: "✅ Allow" },
            { callback_data: "deny:perm-1", text: "❌ Deny" },
          ],
        ],
      },
      text: "Permission requested for `bash`\n```json\n{\n  \"command\": \"ls\"\n}\n```",
    })
  })
})
