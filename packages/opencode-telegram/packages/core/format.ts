import type { ToolArgs } from "./types"

function stringArg(args: ToolArgs, name: string): string {
  const value = args[name]
  return typeof value === "string" ? value : ""
}

export function formatTool(tool: string, args: ToolArgs): string | null {
  switch (tool) {
    case "write":
      return `📝 Wrote \`${stringArg(args, "filePath")}\``
    case "edit":
      return `✏️ Edited \`${stringArg(args, "filePath")}\``
    case "bash":
      return `🔧 Ran: \`${stringArg(args, "command").slice(0, 80)}\``
    case "read":
      return null
    default:
      return `🔩 Tool: \`${tool}\``
  }
}

export const toolSummary = formatTool
