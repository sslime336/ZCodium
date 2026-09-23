import type { IServiceAccessor } from "@zcode/services";
import { useMemo } from "react";
import { useOptionalServices, useServices } from "@/hooks/useServices.js";
import { useRemoteWorkspaceSessionStore } from "@/store/workspaceServicesRegistry.js";

// harness-simplification E2：远程/relay workspace session 与断连代理整体删除。
// workspace services 解析收敛为单一本地链路：优先 renderer 启动时注册的 base services，
// 兼容 Web/测试入口未注册时回退到当前 ServiceProvider 上下文。

function resolveWorkspaceServicesForTarget(params: {
  currentContextServices: IServiceAccessor;
  baseServices: IServiceAccessor | null;
}): IServiceAccessor {
  return params.baseServices ?? params.currentContextServices;
}

function resolveBaseWorkspaceServices(
  contextServices: IServiceAccessor,
  registeredBaseServices: IServiceAccessor | null,
): IServiceAccessor {
  return registeredBaseServices ?? contextServices;
}

export function useBaseWorkspaceServices(): IServiceAccessor {
  const contextServices = useServices();
  const registeredBaseServices = useRemoteWorkspaceSessionStore((state) => state.baseServices);

  // App 会在当前激活 workspace 外层再套一层 ServiceProvider。
  // timeline/search/workspace 这类跨 workspace 查询必须继续查本机 host；
  // 这里优先使用 renderer 启动时注册的根 services，避免上下文污染本地任务列表。
  return resolveBaseWorkspaceServices(contextServices, registeredBaseServices);
}

export function useOptionalBaseWorkspaceServices(): IServiceAccessor | null {
  const contextServices = useOptionalServices();
  const registeredBaseServices = useRemoteWorkspaceSessionStore((state) => state.baseServices);

  // app-global 能力以 base host 为权威；入口未注册 base services 时保留原有 context/null 降级语义。
  return registeredBaseServices ?? contextServices;
}

interface WorkspaceServicesResolution {
  services: IServiceAccessor;
  connectionKind: "local-ready";
  rpcReady: boolean;
}

export function useWorkspaceServicesResolution(
  _workspacePath?: string | null,
  _preferredRemoteSessionId?: string | null,
  _workspaceIdentity?: string | null,
  _remoteTarget?: unknown,
): WorkspaceServicesResolution {
  const currentContextServices = useServices();
  const resolvedServices = useRemoteWorkspaceSessionStore((state) =>
    resolveWorkspaceServicesForTarget({
      currentContextServices,
      baseServices: state.baseServices,
    }),
  );

  return useMemo(
    () => ({
      services: resolvedServices,
      connectionKind: "local-ready" as const,
      rpcReady: true,
    }),
    [resolvedServices],
  );
}

export function useWorkspaceServices(
  workspacePath: string | null | undefined,
  preferredRemoteSessionId?: string | null,
  workspaceIdentity?: string | null,
  remoteTarget?: unknown,
): IServiceAccessor {
  return useWorkspaceServicesResolution(
    workspacePath,
    preferredRemoteSessionId,
    workspaceIdentity,
    remoteTarget,
  ).services;
}
