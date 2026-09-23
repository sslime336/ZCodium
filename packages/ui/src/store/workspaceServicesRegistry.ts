// harness-simplification E2：远程 workspace session 注册表整体删除，
// 这里只保留 renderer 启动时注册的本机 base services 与按 workspace 解析入口。
import { create } from "zustand";
import type { IServiceAccessor } from "@zcode/services";

interface WorkspaceServicesRegistryState {
  baseServices: IServiceAccessor | null;
  registerBaseServices: (services: IServiceAccessor) => void;
}

export const useRemoteWorkspaceSessionStore = create<WorkspaceServicesRegistryState>()((set) => ({
  baseServices: null,
  registerBaseServices: (services) =>
    set({
      baseServices: services,
    }),
}));

export function registerBaseWorkspaceServices(services: IServiceAccessor): void {
  useRemoteWorkspaceSessionStore.getState().registerBaseServices(services);
}

export function getRegisteredBaseWorkspaceServices(): IServiceAccessor | null {
  return useRemoteWorkspaceSessionStore.getState().baseServices;
}

export function resolveRegisteredWorkspaceServices(params: {
  workspacePath?: string;
  workspaceIdentity?: string;
}): IServiceAccessor | null {
  // 远程 attachment 已删除：workspaceIdentity/workspacePath 只是调用方关联上下文，
  // 权威 services 始终是 renderer 启动注册的本地 base services。
  void params;
  return getRegisteredBaseWorkspaceServices();
}
