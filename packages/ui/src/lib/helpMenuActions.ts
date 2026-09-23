import type { IPlatformService } from "@zcode/shared";
import type { IntlInstance } from "@/i18n/IntlProvider.js";
import { runExportLogsAction } from "@/lib/exportLogsAction.js";

// Issues link of this repository (personal harness fork); the help menu
// points issue-report and feature-request actions here instead of any
// official platform feedback service (removed with layer C/D).
export const ZCODIUM_ISSUES_URL = "https://github.com/ZCodium-project/ZCodium/issues";

interface HelpMenuActionHandlers {
  openIssueReport: () => Promise<void>;
  exportLogs: () => void;
}

export function createHelpMenuActionHandlers({
  platform,
  intl,
}: {
  platform: Pick<IPlatformService, "captureWindowScreenshot" | "exportLogs" | "openExternal">;
  intl: IntlInstance;
}): HelpMenuActionHandlers {
  return {
    openIssueReport: async () => {
      // 审计版：问题反馈直接指向本仓库 Issues，不再打开官方反馈弹窗。
      platform.openExternal(ZCODIUM_ISSUES_URL);
    },
    exportLogs: () => {
      void runExportLogsAction(platform, intl);
    },
  };
}
