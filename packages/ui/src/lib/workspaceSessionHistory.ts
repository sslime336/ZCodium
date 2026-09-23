// workspace 会话持久化的本地链路（harness-simplification E2：远程/relay workspace 条目不再恢复或写回）。
// 旧设置里的 kind:"remote" / 远程身份 tab 会被显式跳过，下一次持久化即完成自愈清理。
import type { AppSettings, PersistedWorkspaceSessionEntry } from "@zcode/shared";
import type { WindowTabState } from "@/store/tabStore.js";
import { isWorkspaceTab } from "@/store/tabStore.js";

export function buildWorkspaceSessionKey(entry: {
  workspacePath: string;
  workspaceIdentity?: string;
}): string {
  return entry.workspaceIdentity?.trim() || entry.workspacePath;
}

export function hasRemoteWorkspaceIdentity(entry: {
  remoteSessionId?: string;
  remoteTarget?: unknown;
  workspaceIdentity?: string;
}): boolean {
  // 远程连接链路已删除；该判断只用于识别历史设置里遗留的远程身份，恢复与持久化都必须跳过。
  return Boolean(entry.remoteSessionId || entry.remoteTarget || entry.workspaceIdentity?.startsWith("remote:"));
}

export function buildPersistedWorkspaceSessionEntries(
  tabs: WindowTabState[],
): PersistedWorkspaceSessionEntry[] {
  return tabs.reduce<PersistedWorkspaceSessionEntry[]>((entries, tab) => {
    if (!isWorkspaceTab(tab)) {
      return entries;
    }

    if (hasRemoteWorkspaceIdentity(tab)) {
      // 遗留远程 tab 不再写回 lastWorkspaceSession。
      return entries;
    }

    entries.push({
      kind: "local",
      workspacePath: tab.workspacePath,
      ...(tab.workspacePurpose ? { workspacePurpose: tab.workspacePurpose } : {}),
    });
    return entries;
  }, []);
}

export function readPersistedWorkspaceSessionEntries(
  settings: Pick<AppSettings, "lastWorkspaceSession">,
): PersistedWorkspaceSessionEntry[] {
  return (settings.lastWorkspaceSession ?? []).flatMap((entry) =>
    entry.kind === "local" ? [entry] : [],
  );
}
