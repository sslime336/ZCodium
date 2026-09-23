// 启动/持久化 workspace 会话的本地 hook（harness-simplification E2：
// 原 useRemoteWorkspaceHistory 中远程 session、重连与凭据链路整体删除，只保留本地恢复语义）。
import { useCallback } from "react";
import type { AppSettings } from "@zcode/shared";
import type { IServiceAccessor } from "@zcode/services";
import { logger } from "@/logger.js";
import { buildWorkspacePersistPatch, restorePersistedWorkspaceSessions } from "@/root/workspaceSessionPersistence.js";
import type { TabStore, TabStoreState } from "@/store/tabStore.js";

interface UseWorkspaceSessionHistoryParams {
  services: IServiceAccessor;
  ensureConversationWorkspaceOnRestore: boolean;
  deferInactiveWorkspaceRestore: boolean;
  unavailableWorkspacePath?: string;
  tabStoreApi: TabStore;
}

export function useWorkspaceSessionHistory({
  services,
  ensureConversationWorkspaceOnRestore,
  deferInactiveWorkspaceRestore,
  unavailableWorkspacePath,
  tabStoreApi,
}: UseWorkspaceSessionHistoryParams) {
  const buildPersistedTabPatch = useCallback(
    (state: TabStoreState) => buildWorkspacePersistPatch(state),
    [],
  );

  const restorePersistedSession = useCallback(
    async (settings: AppSettings) => {
      let conversationWorkspacePath: string | undefined;
      if (ensureConversationWorkspaceOnRestore) {
        try {
          conversationWorkspacePath = (await services.fileService.ensureConversationWorkspace())
            .path;
        } catch (error) {
          // 路径创建失败不能连带吞掉真实项目恢复；后续显式新建对话仍会走原有可重试错误入口。
          logger.warn("[Root] 恢复阶段解析 conversation workspace 失败", { error });
        }
      }
      const workspaceRestore = restorePersistedWorkspaceSessions({
        settings,
        tabStoreApi,
        unavailableWorkspacePath,
        conversationWorkspacePath,
        restoreMode: deferInactiveWorkspaceRestore ? "active-first" : "all",
      });
      return {
        ...(conversationWorkspacePath
          ? { excludedRecentProjectPaths: [conversationWorkspacePath] }
          : {}),
        ...(workspaceRestore?.deferredRestore
          ? { deferredRestore: workspaceRestore.deferredRestore }
          : {}),
      };
    },
    [
      deferInactiveWorkspaceRestore,
      ensureConversationWorkspaceOnRestore,
      services.fileService,
      tabStoreApi,
      unavailableWorkspacePath,
    ],
  );

  return { buildPersistedTabPatch, restorePersistedSession };
}
