import { useMemo } from "react";
import type { DynamicWorkflowClientConfig } from "@zcode/shared";

// 动态工作流灰度快照原本由官方 client-config/coding-plan 服务下发（A 层已删除）。
// 远端灰度来源不存在时按 fail-closed 处理：入口保持 disabled，与旧实现
// resolveDynamicWorkflowClientConfig 请求失败的裁决一致。

export interface DynamicWorkflowAvailabilitySnapshot {
  readonly status: "ready";
  readonly enabled: boolean;
  readonly config: DynamicWorkflowClientConfig | null;
}

const DISABLED_SNAPSHOT: DynamicWorkflowAvailabilitySnapshot = {
  status: "ready",
  enabled: false,
  config: null,
};

/**
 * 读动态工作流灰度快照。远端灰度服务已随官方链路移除，恒为 disabled。
 */
export function useDynamicWorkflowAvailability(): DynamicWorkflowAvailabilitySnapshot {
  return useMemo(() => DISABLED_SNAPSHOT, []);
}
