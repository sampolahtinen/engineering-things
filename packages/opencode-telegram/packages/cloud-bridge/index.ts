import { createOpencodeClient as createClient } from "@opencode-ai/sdk/client"
import { ScaleToZeroGuard as KeepAwakeGuard } from "@prisma/compute"

import {
  createThread,
  formatTool,
  notify,
  notifyTopLevel,
  parsePermissionCallback,
  sendPermissionButtons,
  tg,
} from "../core/index"
import type { PermissionAction, TelegramUpdate, ToolArgs } from "../core/index"

export type CloudState = {
  lastUpdateId: number
  permissionSessions: Map<string, string>
  sessionThreads: Map<string, number>
  threadSessions: Map<number, string>
}

type OpenCodeClient = any
type Subscribe = (sessionId: string, threadId: number) => Promise<void>

export function createCloudState(): CloudState {
  return {
    lastUpdateId: 0,
    permissionSessions: new Map(),
    sessionThreads: new Map(),
    threadSessions: new Map(),
  }
}

function text(update: TelegramUpdate): string | undefined {
  return update.message?.text
}

function threadId(update: TelegramUpdate): number | undefined {
  return update.message?.message_thread_id
}

function sessionId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  return stringValue(record.id) ?? stringValue(record.sessionId) ?? stringValue(record.sessionID)
}

function eventSessionId(event: Record<string, unknown>): string | undefined {
  return (
    sessionId(event) ??
    sessionId(event.properties) ??
    stringValue((event.properties as Record<string, unknown> | undefined)?.sessionID)
  )
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function eventType(event: Record<string, unknown>): string | undefined {
  return stringValue(event.type) ?? stringValue(event.event)
}

function isStaleTelegramCallback(error: unknown): boolean {
  const message = String(error)
  return message.includes("query is too old") || message.includes("query ID is invalid")
}

function normalizeSessions(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data as Array<Record<string, unknown>>
    if (Array.isArray(record.sessions)) return record.sessions as Array<Record<string, unknown>>
  }
  return []
}

async function promptSession(oc: OpenCodeClient, id: string, prompt: string): Promise<void> {
  await oc.session?.prompt?.({
    body: { parts: [{ text: prompt, type: "text" }] },
    path: { id },
  })
}

async function answerPermission(oc: OpenCodeClient, id: string, permissionId: string, action: PermissionAction): Promise<void> {
  await oc.postSessionByIdPermissionsByPermissionId?.({
    body: { action },
    path: { id, permissionId },
  })
}

async function handleAgentStart(
  oc: OpenCodeClient,
  state: CloudState,
  prompt: string,
  subscribe: Subscribe,
): Promise<void> {
  try {
    const session = await oc.session.create({ body: { title: prompt.slice(0, 60) } })
    const id = sessionId(session)
    if (!id) throw new Error("OpenCode session create did not return an id")

    const thread = await createThread(`🤖 ${prompt.slice(0, 40)}`)
    state.sessionThreads.set(id, thread)
    state.threadSessions.set(thread, id)

    await notify(thread, "🚀 Started")
    await promptSession(oc, id, prompt)
    void subscribe(id, thread).catch((error) => console.error("OpenCode event subscription failed", error))
  } catch (error) {
    console.error("Failed to start OpenCode session from Telegram", error)
  }
}

async function handleAgentList(oc: OpenCodeClient): Promise<void> {
  try {
    const sessions = normalizeSessions(await oc.session.list())
    const body = sessions.length
      ? sessions
          .map((session, index) => {
            const title = stringValue(session.title) ?? stringValue(session.id) ?? "Untitled"
            const status = stringValue(session.status) ?? "unknown"
            return `${index + 1}. ${title} - ${status}`
          })
          .join("\n")
      : "No sessions"

    await notifyTopLevel(body)
  } catch (error) {
    console.error("Failed to list OpenCode sessions", error)
  }
}

async function handleAgentAttach(
  oc: OpenCodeClient,
  state: CloudState,
  rawNumber: string,
  subscribe: Subscribe,
): Promise<void> {
  try {
    const sessions = normalizeSessions(await oc.session.list())
    const session = sessions[Number(rawNumber) - 1]
    const id = sessionId(session)
    if (!id) return

    const existingThread = state.sessionThreads.get(id)
    if (existingThread) {
      await notify(existingThread, "🔗 Session already attached")
      return
    }

    const title = stringValue(session.title) ?? id
    const thread = await createThread(`🤖 ${title.slice(0, 40)}`)
    state.sessionThreads.set(id, thread)
    state.threadSessions.set(thread, id)
    await notify(thread, "🔗 Attached")
    void subscribe(id, thread).catch((error) => console.error("OpenCode event subscription failed", error))
  } catch (error) {
    console.error("Failed to attach OpenCode session from Telegram", error)
  }
}

export async function handleTelegramUpdate(
  oc: OpenCodeClient,
  state: CloudState,
  update: TelegramUpdate,
  subscribe: Subscribe = (sessionId, targetThreadId) => subscribeToSession(oc, state, sessionId, targetThreadId),
): Promise<void> {
  const messageText = text(update)

  if (messageText?.startsWith("/agent start ")) {
    await handleAgentStart(oc, state, messageText.slice("/agent start ".length).trim(), subscribe)
    return
  }

  if (messageText === "/agent list") {
    await handleAgentList(oc)
    return
  }

  if (messageText?.startsWith("/agent attach ")) {
    await handleAgentAttach(oc, state, messageText.slice("/agent attach ".length).trim(), subscribe)
    return
  }

  const targetThreadId = threadId(update)
  if (messageText && targetThreadId) {
    const id = state.threadSessions.get(targetThreadId)
    if (id) {
      try {
        await promptSession(oc, id, messageText)
      } catch (error) {
        console.error("Failed to send Telegram message to OpenCode session", error)
      }
    }
  }

  const callback = update.callback_query
  const parsed = parsePermissionCallback(callback?.data)
  if (callback && parsed) {
    try {
      await tg("answerCallbackQuery", { callback_query_id: callback.id })
    } catch (error) {
      if (!isStaleTelegramCallback(error)) console.error("Failed to answer Telegram callback query", error)
    }

    try {
      const id = state.permissionSessions.get(parsed.permissionId)
      if (id) await answerPermission(oc, id, parsed.permissionId, parsed.action)
    } catch (error) {
      console.error("Failed to answer OpenCode permission", error)
    }
  }
}

export async function subscribeToSession(
  oc: OpenCodeClient,
  state: CloudState,
  targetSessionId: string,
  targetThreadId: number,
): Promise<void> {
  try {
    const stream = await oc.event.subscribe()
    for await (const event of stream as AsyncIterable<Record<string, unknown>>) {
      if (eventSessionId(event) !== targetSessionId) continue

      const type = eventType(event)
      const properties = (event.properties as Record<string, unknown> | undefined) ?? event

      try {
        if (type === "session.idle") await notify(targetThreadId, "✅ Idle — your turn")
        if (type === "session.error") {
          await notify(targetThreadId, `❌ Error: ${stringValue(properties.message) ?? "Unknown error"}`)
        }
        if (type === "tool.execute.after") {
          const tool = stringValue(properties.tool) ?? stringValue(properties.toolName)
          if (!tool) continue
          const message = formatTool(tool, (properties.args as ToolArgs | undefined) ?? {})
          if (message) await notify(targetThreadId, message)
        }
        if (type === "permission.asked" || type === "permission.ask") {
          const permissionId = stringValue(properties.permissionId) ?? stringValue(properties.id)
          const tool = stringValue(properties.tool) ?? stringValue(properties.toolName) ?? "unknown"
          if (!permissionId) continue
          state.permissionSessions.set(permissionId, targetSessionId)
          await sendPermissionButtons(targetThreadId, permissionId, tool, (properties.args as ToolArgs | undefined) ?? {})
        }
      } catch (error) {
        console.error("Failed to handle OpenCode session event", error)
      }
    }
  } catch (error) {
    console.error("OpenCode event subscription failed", error)
  }
}

export async function runPollingLoop(oc: OpenCodeClient, state: CloudState, signal?: AbortSignal): Promise<void> {
  while (!signal?.aborted) {
    try {
      const updates = await tg<TelegramUpdate[]>("getUpdates", {
        allowed_updates: ["message", "callback_query"],
        offset: state.lastUpdateId + 1,
        timeout: 30,
      })

      for (const update of updates) {
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id)
        await handleTelegramUpdate(oc, state, update)
      }
    } catch (error) {
      console.error("Telegram polling failed", error)
    }
  }
}

export async function runGuardedPollingLoop(oc: OpenCodeClient, state = createCloudState()): Promise<void> {
  for (;;) {
    const signal = AbortSignal.timeout(24 * 60 * 60_000)
    const guard = new KeepAwakeGuard({ signal })

    try {
      await runPollingLoop(oc, state, signal)
    } finally {
      guard.release()
    }

    if (!signal.aborted) return
  }
}

if (import.meta.main) {
  const baseUrl = process.env.OPENCODE_URL
  if (!baseUrl) throw new Error("OPENCODE_URL is required")
  const oc = createClient({ baseUrl })
  await runGuardedPollingLoop(oc)
}
