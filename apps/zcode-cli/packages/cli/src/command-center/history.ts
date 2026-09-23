import type { TuiPromptInput } from "@zcode/tui";
import type { CommandCenterDeps } from "./types.js";

export async function recordSlashCommandInHistory(
  deps: CommandCenterDeps,
  input: TuiPromptInput,
): Promise<void> {
  // 官方 `/login <api-key>` 输入已随账号体系下线，不再有需要在历史里剔除的敏感命令。
  if (!deps.recordInputHistory) return;
  try {
    await deps.recordInputHistory(input, "slash_command");
  } catch {
    // Input history is recall UX; command execution must not depend on it.
  }
}
