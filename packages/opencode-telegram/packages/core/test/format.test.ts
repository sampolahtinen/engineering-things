import { describe, expect, test } from "bun:test"

import { formatTool, toolSummary } from "../format"

describe("tool formatting", () => {
  test("summarizes meaningful tool activity for Telegram", () => {
    expect(formatTool("write", { filePath: "src/app.ts" })).toBe("📝 Wrote `src/app.ts`")
    expect(formatTool("edit", { filePath: "src/app.ts" })).toBe("✏️ Edited `src/app.ts`")
    expect(formatTool("read", { filePath: "src/app.ts" })).toBeNull()
    expect(formatTool("unknown", {})).toBe("🔩 Tool: `unknown`")
  })

  test("truncates bash commands to 80 characters", () => {
    const command = "x".repeat(81)

    expect(formatTool("bash", { command })).toBe(`🔧 Ran: \`${"x".repeat(80)}\``)
  })

  test("toolSummary uses the same public behavior as formatTool", () => {
    expect(toolSummary("write", { filePath: "README.md" })).toBe(formatTool("write", { filePath: "README.md" }))
  })
}
)
