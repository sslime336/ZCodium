import { ModelSelectionFacade, type ProviderRegistryFacadeSource } from "@zcode/provider";
import { resolveLegacyReasoningLevel } from "./legacy-reasoning-level.js";

/** Host 与受管理 Worker 共用身份分类；解析仍由纯 Provider Facade 负责。 */
export function createNodeModelSelectionFacade(
  source: ProviderRegistryFacadeSource,
): ModelSelectionFacade {
  return new ModelSelectionFacade(
    source,
    () => {
      // 官方账号/闲时 Provider 分类已随平台删除；所有 Provider 都是用户自配的普通身份。
      return "ordinary";
    },
    resolveLegacyReasoningLevel,
  );
}
