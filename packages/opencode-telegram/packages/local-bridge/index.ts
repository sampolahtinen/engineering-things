import type { Plugin } from "@opencode-ai/plugin"

import { createThread, formatTool, notify, parsePermissionCallback, sendPermissionButtons, tg } from "../core/index"
import type { PermissionAction, ToolArgs, TelegramUpdate } from "../core/index"

let activeSession: string | null = null
let activeThreadId: number | null = null
let polling = false
let lastUpdateId = 0

const threadSessions = new Map<number, string>()
const permissionSessions = new Map<string, string>()
const permissionApis = new Map<string, "legacy" | "v2">()

type HookInput = Record<string, unknown>
type HookOutput = { parts?: unknown[] }
type Hooks = Record<string, (input: HookInput, output?: HookOutput) => Promise<void>>

function commandText(input: HookInput): string | undefined {
  const command = stringValue(input.command) ?? stringValue(input.text) ?? stringValue((input.args as HookInput | undefined)?.command)
  const args = stringValue(input.arguments)

  if (command === "remote-on") return "/remote on"
  if (command === "remote-off") return "/remote off"
  if (command === "remote" && args) return `/remote ${args}`
  if (command === "remote") return "/remote"
  return command
}

function sessionId(input: HookInput): string | undefined {
  return (
    stringValue(input.sessionId) ??
    stringValue(input.sessionID) ??
    stringValue((input.session as HookInput | undefined)?.id) ??
    stringValue((input.properties as HookInput | undefined)?.sessionID) ??
    stringValue((input.properties as HookInput | undefined)?.sessionId)
  )
}

function eventType(input: HookInput): string | undefined {
  return stringValue(input.type) ?? stringValue(input.event) ?? stringValue((input.event as HookInput | undefined)?.type)
}

function eventProperties(input: HookInput): HookInput {
  const event = input.event
  if (event && typeof event === "object") {
    const properties = (event as HookInput).properties
    if (properties && typeof properties === "object") return properties as HookInput
    return event as HookInput
  }
  return input
}

function permissionEventInput(type: string | undefined, properties: HookInput): HookInput | null {
  if (type === "permission.updated") return properties

  if (type === "permission.asked") {
    return {
      id: properties.id,
      metadata: {
        ...(properties.metadata && typeof properties.metadata === "object" ? (properties.metadata as Record<string, unknown>) : {}),
        always: properties.always,
        patterns: properties.patterns,
      },
      sessionID: properties.sessionID,
      title: properties.permission,
      type: properties.permission,
    }
  }

  if (type === "permission.v2.asked") {
    return {
      id: properties.id,
      metadata: {
        ...(properties.metadata && typeof properties.metadata === "object" ? (properties.metadata as Record<string, unknown>) : {}),
        resources: properties.resources,
        source: properties.source,
      },
      sessionID: properties.sessionID,
      title: properties.action,
      type: properties.action,
      version: "v2",
    }
  }

  return null
}

function responseData(value: unknown): unknown {
  if (value && typeof value === "object" && "data" in value) return (value as { data: unknown }).data
  return value
}

async function sessionThreadName(client: any, id: string): Promise<string> {
  try {
    const session = responseData(await client.session?.get?.({ path: { id } }))
    if (session && typeof session === "object") {
      const title = stringValue((session as Record<string, unknown>).title)
      if (title) return title.slice(0, 128)
    }
  } catch (error) {
    console.error("Failed to get OpenCode session title", error)
  }

  return `OpenCode ${id.slice(0, 20)}`
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

function isStaleTelegramCallback(error: unknown): boolean {
  const message = String(error)
  return message.includes("query is too old") || message.includes("query ID is invalid")
}

async function promptSession(client: any, id: string, text: string): Promise<void> {
  await client.session?.prompt?.({
    body: { parts: [{ text, type: "text" }] },
    path: { id },
  })
}

async function answerPermission(
  client: any,
  serverUrl: URL | undefined,
  id: string,
  permissionId: string,
  action: PermissionAction,
): Promise<void> {
  const response = action === "allow" ? "once" : "reject"
  const api = permissionApis.get(permissionId)

  if (serverUrl) {
    await replyPermissionThroughServer(serverUrl, id, permissionId, response)
    return
  }

  if (api === "v2" && client.permission?.reply) {
    await assertSdkResult(client.permission.reply({ requestID: permissionId, reply: response }), "permission.reply")
    return
  }

  if (api === "v2" && client.permission?.respond) {
    await assertSdkResult(client.permission.respond({ permissionID: permissionId, response, sessionID: id }), "permission.respond")
    return
  }

  if (client.session?.postSessionIdPermissionsPermissionId) {
    await assertSdkResult(client.session.postSessionIdPermissionsPermissionId({
      body: { response },
      path: { id, permissionID: permissionId },
    }), "session.postSessionIdPermissionsPermissionId")
    return
  }

  if (client.postSessionIdPermissionsPermissionId) {
    await assertSdkResult(client.postSessionIdPermissionsPermissionId({
      body: { response },
      path: { id, permissionID: permissionId },
    }), "postSessionIdPermissionsPermissionId")
    return
  }

  if (client.permission?.reply) {
    await assertSdkResult(client.permission.reply({ requestID: permissionId, reply: response }), "permission.reply")
    return
  }

  if (client.permission?.respond) {
    await assertSdkResult(client.permission.respond({ permissionID: permissionId, response, sessionID: id }), "permission.respond")
    return
  }

  throw new Error("No OpenCode permission reply method found")
}

async function replyPermissionThroughServer(
  serverUrl: URL,
  sessionId: string,
  permissionId: string,
  response: "once" | "always" | "reject",
): Promise<void> {
  const sessionScopedResult = await postPermissionReply(
    new URL(`/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(permissionId)}/reply`, serverUrl),
    response,
  )
  if (sessionScopedResult.ok) return

  const globalResult = await postPermissionReply(new URL(`/permission/${encodeURIComponent(permissionId)}/reply`, serverUrl), response)
  if (globalResult.ok) return

  throw new Error(
    `permission reply failed: session endpoint HTTP ${sessionScopedResult.status} ${sessionScopedResult.body}; global endpoint HTTP ${globalResult.status} ${globalResult.body}`,
  )
}

async function postPermissionReply(url: URL, response: "once" | "always" | "reject"): Promise<{ body: string; ok: boolean; status: number }> {
  const result = await fetch(url, {
    body: JSON.stringify({ reply: response }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

  return { body: await result.text(), ok: result.ok, status: result.status }
}

async function assertSdkResult(resultPromise: Promise<unknown>, method: string): Promise<void> {
  const result = await resultPromise

  if (!result || typeof result !== "object") return

  const record = result as Record<string, unknown>
  if (record.error) throw new Error(`${method} failed: ${JSON.stringify(record.error)}`)

  const response = record.response
  if (response instanceof Response && !response.ok) throw new Error(`${method} failed: HTTP ${response.status}`)
}

async function logBridge(client: any, level: "debug" | "info" | "warn" | "error", message: string, extra?: Record<string, unknown>): Promise<void> {
  try {
    await client.app?.log?.({
      body: {
        extra,
        level,
        message,
        service: "telegram-bridge",
      },
    })
  } catch (error) {
    console.error(`telegram-bridge ${level}: ${message}`, extra, error)
  }
}

async function answerPermissionCallback(
  client: any,
  serverUrl: URL | undefined,
  callbackId: string,
  permissionId: string,
  action: PermissionAction,
): Promise<void> {
  const id = permissionSessions.get(permissionId)
  await logBridge(client, "info", "permission callback received", { action, hasSession: Boolean(id), permissionId })

  try {
    await tg("answerCallbackQuery", { callback_query_id: callbackId })
  } catch (error) {
    if (!isStaleTelegramCallback(error)) console.error("Failed to answer Telegram callback query", error)
  }

  if (!id) {
    await logBridge(client, "warn", "permission callback ignored because session mapping is missing", { permissionId })
    return
  }

  try {
    await answerPermission(client, serverUrl, id, permissionId, action)
    await logBridge(client, "info", "OpenCode permission answered", { action, permissionId, sessionID: id })
  } catch (error) {
    await logBridge(client, "error", "failed to answer OpenCode permission", { action, error: String(error), permissionId, sessionID: id })
    console.error("Failed to answer OpenCode permission", error)
  }
}

async function handleUpdate(client: any, serverUrl: URL | undefined, update: TelegramUpdate): Promise<void> {
  const message = update.message
  if (message?.text && message.message_thread_id) {
    const id = threadSessions.get(message.message_thread_id)
    if (id) await promptSession(client, id, message.text)
  }

  const callback = update.callback_query
  const parsed = parsePermissionCallback(callback?.data)
  if (callback && parsed) {
    await answerPermissionCallback(client, serverUrl, callback.id, parsed.permissionId, parsed.action)
  }
}

async function startPolling(client: any, serverUrl: URL | undefined): Promise<void> {
  if (polling) return
  polling = true

  while (polling) {
    try {
      const updates = await tg<TelegramUpdate[]>("getUpdates", {
        allowed_updates: ["message", "callback_query"],
        offset: lastUpdateId + 1,
        timeout: 30,
      })

      for (const update of updates) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id)
        await handleUpdate(client, serverUrl, update)
      }
    } catch (error) {
      console.error("Telegram polling failed", error)
    }
  }
}

async function handleCommand(client: any, serverUrl: URL | undefined, input: HookInput, shouldPoll: boolean, output?: HookOutput): Promise<void> {
  const command = commandText(input)
  const id = sessionId(input)

  if (command === "/remote" && output) output.parts = []

  if (command === "/remote on" && id) {
    if (output) output.parts = []
    try {
      const threadId = await createThread(await sessionThreadName(client, id))
      activeSession = id
      activeThreadId = threadId
      threadSessions.set(threadId, id)
      await notify(threadId, "📡 Remote mode active")
      if (shouldPoll) void startPolling(client, serverUrl)
    } catch (error) {
      console.error("Failed to enable Telegram remote mode", error)
    }
  }

  if (command === "/remote off") {
    if (output) output.parts = []
    polling = false
    if (activeThreadId) {
      try {
        await notify(activeThreadId, "📴 Remote mode off")
      } catch (error) {
        console.error("Failed to disable Telegram remote mode", error)
      }
    }
  }
}

async function handleTool(input: HookInput): Promise<void> {
  if (!activeThreadId || sessionId(input) !== activeSession) return

  const tool = stringValue(input.tool) ?? stringValue(input.toolName) ?? stringValue((input.tool as HookInput | undefined)?.name)
  if (!tool) return

  const text = formatTool(tool, (input.args as ToolArgs | undefined) ?? {})
  if (!text) return

  try {
    await notify(activeThreadId, text)
  } catch (error) {
    console.error("Failed to notify Telegram tool event", error)
  }
}

async function handleEvent(input: HookInput): Promise<void> {
  const type = eventType(input)
  const properties = eventProperties(input)

  if (!activeThreadId || sessionId(properties) !== activeSession) return

  const message = stringValue(properties.message) ?? stringValue((properties.error as HookInput | undefined)?.message)

  try {
    if (type === "session.idle") await notify(activeThreadId, "✅ Idle — your turn")
    if (type === "session.error") await notify(activeThreadId, `❌ Error: ${message ?? "Unknown error"}`)
  } catch (error) {
    console.error("Failed to notify Telegram session event", error)
  }
}

async function handlePluginEvent(client: any, input: HookInput): Promise<void> {
  const type = eventType(input)
  const properties = eventProperties(input)
  const permissionInput = permissionEventInput(type, properties)

  if (permissionInput) {
    await handlePermission(client, permissionInput)
    return
  }

  await handleEvent(input)
}

async function handlePermission(client: any, input: HookInput): Promise<void> {
  await logBridge(client, "info", "permission.ask received", {
    activeSession,
    activeThreadId,
    id: stringValue(input.id),
    sessionID: stringValue(input.sessionID),
    title: stringValue(input.title),
    type: stringValue(input.type),
  })

  if (!activeThreadId) {
    await logBridge(client, "warn", "permission.ask ignored because remote mode is inactive")
    return
  }

  const id = sessionId(input)
  const permissionId = stringValue(input.permissionId) ?? stringValue(input.id)
  const tool = stringValue(input.tool) ?? stringValue(input.toolName) ?? stringValue(input.type) ?? stringValue(input.title) ?? "unknown"

  if (!id || !permissionId) {
    await logBridge(client, "warn", "permission.ask ignored because session or permission id is missing", {
      permissionId,
      sessionID: id,
    })
    return
  }

  if (permissionSessions.has(permissionId)) {
    await logBridge(client, "debug", "permission.ask ignored because buttons were already sent", { permissionId, sessionID: id })
    return
  }

  permissionSessions.set(permissionId, id)
  permissionApis.set(permissionId, stringValue(input.version) === "v2" ? "v2" : "legacy")

  try {
    const args = (input.args as ToolArgs | undefined) ?? (input.metadata as ToolArgs | undefined) ?? {}
    await sendPermissionButtons(activeThreadId, permissionId, tool, args)
    await logBridge(client, "info", "permission buttons sent", { permissionId, sessionID: id, threadId: activeThreadId })
  } catch (error) {
    await logBridge(client, "error", "failed to send permission buttons", { error: String(error), permissionId, sessionID: id })
    console.error("Failed to send Telegram permission buttons", error)
  }
}

export const TelegramBridge = (async ({ client, serverUrl }, options?: { poll?: boolean }) => {
  const shouldPoll = options?.poll !== false
  const hooks: Hooks = {
    "command.execute.before": async (input, output) => handleCommand(client, serverUrl, input, shouldPoll, output),
    event: async (input) => handlePluginEvent(client, input),
    "permission.ask": async (input) => handlePermission(client, input),
    "permission.asked": async (input) => handlePermission(client, input),
    "tool.execute.after": handleTool,
    "tui.command.execute": async (input, output) => handleCommand(client, serverUrl, input, shouldPoll, output),
  }
  return hooks
}) satisfies Plugin

export default TelegramBridge
