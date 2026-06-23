import type { PermissionAction, ToolArgs } from "./types"

type TelegramResult<T> = {
  ok: boolean
  description?: string
  result: T
}

function env(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${env("TG_BOT_TOKEN")}/${method}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  const payload = (await response.json()) as TelegramResult<T>

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} failed`)
  }

  return payload.result
}

export async function notify(threadId: number, text: string, parseMode = "Markdown"): Promise<void> {
  await tg("sendMessage", {
    chat_id: env("TG_GROUP_ID"),
    message_thread_id: threadId,
    parse_mode: parseMode,
    text,
  })
}

export async function notifyTopLevel(text: string, parseMode = "Markdown"): Promise<void> {
  await tg("sendMessage", {
    chat_id: env("TG_GROUP_ID"),
    parse_mode: parseMode,
    text,
  })
}

export async function createThread(name: string): Promise<number> {
  const result = await tg<{ message_thread_id: number }>("createForumTopic", {
    chat_id: env("TG_GROUP_ID"),
    name,
  })
  return result.message_thread_id
}

export async function sendPermissionButtons(
  threadId: number,
  permissionId: string,
  tool: string,
  args: ToolArgs,
): Promise<void> {
  await tg("sendMessage", {
    chat_id: env("TG_GROUP_ID"),
    message_thread_id: threadId,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { callback_data: `allow:${permissionId}`, text: "✅ Allow" },
          { callback_data: `deny:${permissionId}`, text: "❌ Deny" },
        ],
      ],
    },
    text: `Permission requested for \`${tool}\`\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``,
  })
}

export function parsePermissionCallback(data: string | undefined): { action: PermissionAction; permissionId: string } | null {
  if (!data) return null
  const [action, permissionId] = data.split(":", 2)
  if ((action !== "allow" && action !== "deny") || !permissionId) return null
  return { action, permissionId }
}
