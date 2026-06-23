import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { createCloudState, handleTelegramUpdate } from "../index"

const originalFetch = globalThis.fetch
const tgCalls: Array<{ body: unknown; url: string }> = []

beforeEach(() => {
  tgCalls.length = 0
  process.env.TG_BOT_TOKEN = "token"
  process.env.TG_GROUP_ID = "-100"
  globalThis.fetch = (async (url, init) => {
    tgCalls.push({ body: JSON.parse(String(init?.body)), url: String(url) })
    return new Response(JSON.stringify({ ok: true, result: { message_thread_id: 42 } }))
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.TG_BOT_TOKEN
  delete process.env.TG_GROUP_ID
})

describe("cloud bridge Telegram commands", () => {
  test("/agent start creates a session, thread, and sends the prompt", async () => {
    const createdTitles: string[] = []
    const prompts: unknown[] = []
    const subscriptions: string[] = []
    const oc = {
      session: {
        create: async ({ body }: { body: { title: string } }) => {
          createdTitles.push(body.title)
          return { id: "session-1", status: "running", title: body.title }
        },
        prompt: async (input: unknown) => prompts.push(input),
      },
    }
    const state = createCloudState()

    await handleTelegramUpdate(
      oc,
      state,
      { update_id: 1, message: { text: "/agent start build the bridge" } },
      async (sessionId) => {
        subscriptions.push(sessionId)
      },
    )

    expect(createdTitles).toEqual(["build the bridge"])
    expect(state.sessionThreads.get("session-1")).toBe(42)
    expect(state.threadSessions.get(42)).toBe("session-1")
    expect(tgCalls.map((call) => call.url)).toEqual([
      "https://api.telegram.org/bottoken/createForumTopic",
      "https://api.telegram.org/bottoken/sendMessage",
    ])
    expect(tgCalls[1]?.body).toMatchObject({ message_thread_id: 42, text: "🚀 Started" })
    expect(prompts).toEqual([{ body: { parts: [{ text: "build the bridge", type: "text" }] }, path: { id: "session-1" } }])
    expect(subscriptions).toEqual(["session-1"])
  })

  test("plain text in an attached thread is sent to that session", async () => {
    const prompts: unknown[] = []
    const oc = { session: { prompt: async (input: unknown) => prompts.push(input) } }
    const state = createCloudState()
    state.threadSessions.set(42, "session-1")

    await handleTelegramUpdate(oc, state, { update_id: 2, message: { message_thread_id: 42, text: "continue" } })

    expect(prompts).toEqual([{ body: { parts: [{ text: "continue", type: "text" }] }, path: { id: "session-1" } }])
  })

  test("permission callbacks are routed to the session that asked", async () => {
    const permissions: unknown[] = []
    const oc = {
      postSessionByIdPermissionsByPermissionId: async (input: unknown) => permissions.push(input),
    }
    const state = createCloudState()
    state.permissionSessions.set("perm-1", "session-1")

    await handleTelegramUpdate(oc, state, {
      callback_query: { data: "allow:perm-1", id: "callback-1" },
      update_id: 3,
    })

    expect(permissions).toEqual([{ body: { action: "allow" }, path: { id: "session-1", permissionId: "perm-1" } }])
    expect(tgCalls[0]?.body).toEqual({ callback_query_id: "callback-1" })
  })
})
