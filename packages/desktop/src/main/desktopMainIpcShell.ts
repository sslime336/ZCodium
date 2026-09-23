import { ipcMain, shell } from "electron";
import { PlatformChannels } from "@zcode/shared";
import { dispatchTaskNotification } from "./desktopNotifications.js";
import { deliverPendingDeepLink } from "./desktopOAuthDeepLink.js";
import { openPathInDefaultApp } from "./desktopMainIpcHelpers.js";

function isAllowedExternalOpenUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";
  } catch {
    return false;
  }
}

interface OpenExternalRequest {
  url: string;
}

function parseOpenExternalRequest(payload: unknown): OpenExternalRequest | null {
  if (typeof payload === "string") {
    return { url: payload };
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.url !== "string") {
    return null;
  }
  return { url: record.url };
}

/**
 * 窗口级 shell/通知 IPC 注册。远程连接与 OAuth 回调 handler 已随
 * harness-simplification（登录体系与远控链路删除）移除。
 */
export function registerShellIpcHandlers(options: {
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}) {
  ipcMain.on(PlatformChannels.OpenExternal, (_event, payload: unknown) => {
    const request = parseOpenExternalRequest(payload);
    if (!request) {
      options.logger.warn("[open-external] blocked unsupported request", payload);
      return;
    }
    const { url } = request;
    if (!isAllowedExternalOpenUrl(url)) {
      options.logger.warn("[open-external] blocked unsupported url", url);
      return;
    }
    void Promise.resolve(shell.openExternal(url)).catch((error: unknown) => {
      options.logger.warn("[open-external] 外部 URL 打开失败", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  ipcMain.handle(PlatformChannels.OpenExternalFile, async (_event, rawPath: string) =>
    openPathInDefaultApp(rawPath, options.logger),
  );

  ipcMain.on(PlatformChannels.RendererReady, (event) => {
    deliverPendingDeepLink(event.sender);
  });
  ipcMain.on(PlatformChannels.ShowTaskNotification, (event, payload: unknown) => {
    dispatchTaskNotification({ event, payload, logger: options.logger });
  });
  ipcMain.handle(PlatformChannels.ShowTaskNotification, (event, payload: unknown) =>
    dispatchTaskNotification({ event, payload, logger: options.logger }),
  );
}
