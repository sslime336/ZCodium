import { getZCodeCopy } from "@zcode/i18n";
import type { CommandCenterApp } from "./command-center.js";

/** 无可用模型时的提示（产品已无账号/登录概念，这里只表达 Provider 未配置）。 */
export function modelSetupRequiredResponse(locale?: string): string {
  const copy = getZCodeCopy(locale).tui.modelSetupRequired;
  return [copy.message, copy.help].join("\n");
}

/** Registry already applies provider availability, including personal providers. */
export function createTuiModelAvailabilityChecker(
  getApp: () => Promise<CommandCenterApp>,
): () => Promise<boolean> {
  return async () => {
    const app = await getApp();
    return ((await app.listModels?.()) ?? []).some((model) => !model.disabledReason);
  };
}
