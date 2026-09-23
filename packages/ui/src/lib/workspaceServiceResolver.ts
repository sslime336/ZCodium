import type { IServiceAccessor } from "@zcode/services";
import { buildTaskWorkspaceKey } from "@/lib/taskQueryCache.js";

// harness-simplification E2：远程 session 解析已删除，workspace services 一律回落本机 base services。
// 保留 lookup 形态（按 workspaceKey 索引）是因为 timeline/grouped 列表用 membership 过滤任务项。

interface WorkspaceServiceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
}

interface ResolvedWorkspaceServices {
  services: IServiceAccessor;
}

export function resolveWorkspaceServices(
  _target: WorkspaceServiceTarget,
  baseServices: IServiceAccessor,
): ResolvedWorkspaceServices {
  return { services: baseServices };
}

export function buildWorkspaceServiceLookup(
  workspaceTabs: WorkspaceServiceTarget[],
  baseServices: IServiceAccessor,
): Map<string, ResolvedWorkspaceServices> {
  const lookup = new Map<string, ResolvedWorkspaceServices>();

  for (const tab of workspaceTabs) {
    lookup.set(buildTaskWorkspaceKey(tab.workspacePath, tab.workspaceIdentity), {
      services: baseServices,
    });
  }

  return lookup;
}
