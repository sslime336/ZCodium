import { assertOfficialPlatformAccessible } from "@zcode/shared";
import type { EnvRecord } from "./model-execution.js";

export type OfficialCodingPlanGatewayFetch = typeof globalThis.fetch;

// 官方 Coding Plan 网关改写已随账号体系下线：CLI 只按用户配置的 baseUrl 直连。
// 这里仅保留出口守卫——历史内置配置可能仍指向平台网关，请求前必须拒绝。
export function createOfficialCodingPlanGatewayFetch(options: {
  env?: EnvRecord;
  fetch: OfficialCodingPlanGatewayFetch;
}): OfficialCodingPlanGatewayFetch {
  return async (input, init) => {
    assertOfficialPlatformAccessible(input instanceof Request ? input.url : input);
    return options.fetch(input, init);
  };
}
