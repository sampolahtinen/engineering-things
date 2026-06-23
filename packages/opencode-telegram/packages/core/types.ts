export type ToolArgs = Record<string, unknown>

export type PermissionAction = "allow" | "deny"

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_thread_id?: number
    text?: string
  }
  callback_query?: {
    id: string
    data?: string
  }
}
