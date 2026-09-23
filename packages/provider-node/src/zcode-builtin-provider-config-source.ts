import { watch, type FSWatcher } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { ProviderConfigLayerSnapshot, ProviderSource } from "@zcode/provider";
import {
  decodeZCodeBuiltinRelease,
  serializeZCodeBuiltinRelease,
  type ZCodeBuiltinRelease,
} from "./zcode-builtin-release.js";

export interface NodeZCodeBuiltinProviderConfigSourceOptions {
  readonly bundledFilePath: string;
  readonly watch?: boolean;
}

/**
 * Reads the bundled (on-disk, app-shipped) ZCode Built-in provider config release.
 * The CDN download/refresh link was removed; this source only publishes the local
 * bundled file as a Config Snapshot, optionally re-emitting when the file changes.
 */
export class NodeZCodeBuiltinProviderConfigSource implements ProviderSource<ProviderConfigLayerSnapshot> {
  readonly #bundledFilePath: string;
  readonly #sourceKey: string;
  readonly #watchEnabled: boolean;
  readonly #listeners = new Set<(reason: string) => void>();
  #watcher: FSWatcher | null = null;
  #observedSignature: string | null = null;
  #watchRefresh = Promise.resolve();
  #disposed = false;

  constructor(options: NodeZCodeBuiltinProviderConfigSourceOptions) {
    const bundledFilePath = options.bundledFilePath.trim();
    if (!bundledFilePath) throw new Error("ZCode Built-in bundledFilePath 不能为空");
    this.#bundledFilePath = bundledFilePath;
    // 稳定来源标识：同一文件路径下的 revision 才能被 Registry 安全复用。
    this.#sourceKey = createHash("sha256").update(resolve(bundledFilePath)).digest("hex");
    this.#watchEnabled = options.watch !== false;
  }

  get bundledFilePath(): string {
    return this.#bundledFilePath;
  }

  async read(): Promise<ProviderConfigLayerSnapshot> {
    this.#assertNotDisposed();
    const release = await readBundledRelease(this.#bundledFilePath);
    this.#ensureWatcher();
    this.#observedSignature ??= signatureOf(release);
    return snapshotFromRelease(release, this.#sourceKey);
  }

  onDidChange(listener: (reason: string) => void): () => void {
    this.#assertNotDisposed();
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#watcher?.close();
    this.#watcher = null;
    this.#listeners.clear();
  }

  #ensureWatcher(): void {
    if (!this.#watchEnabled || this.#watcher || this.#disposed) return;
    const target = basename(this.#bundledFilePath);
    try {
      this.#watcher = watch(dirname(this.#bundledFilePath), (_eventType, fileName) => {
        if (fileName === null || fileName.toString() === target) this.#scheduleWatchRefresh();
      });
      this.#watcher.on("error", () => this.#emit("watch-error"));
    } catch {
      // 监听只是开发态便利；目录不可监听时读取路径本身仍然可用。
    }
  }

  #scheduleWatchRefresh(): void {
    this.#watchRefresh = this.#watchRefresh.then(async () => {
      if (this.#disposed) return;
      try {
        const release = await readBundledRelease(this.#bundledFilePath);
        const signature = signatureOf(release);
        if (this.#disposed || signature === this.#observedSignature) return;
        this.#observedSignature = signature;
        this.#emit("file-changed");
      } catch {
        this.#emit("watch-error");
      }
    });
  }

  #emit(reason: string): void {
    if (this.#disposed) return;
    for (const listener of this.#listeners) listener(reason);
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new Error("NodeZCodeBuiltinProviderConfigSource 已 dispose");
  }
}

export function createNodeZCodeBuiltinProviderConfigSource(
  options: NodeZCodeBuiltinProviderConfigSourceOptions,
): NodeZCodeBuiltinProviderConfigSource {
  return new NodeZCodeBuiltinProviderConfigSource(options);
}

async function readBundledRelease(filePath: string): Promise<ZCodeBuiltinRelease> {
  return decodeZCodeBuiltinRelease(JSON.parse(await readFile(filePath, "utf8")));
}

function snapshotFromRelease(
  release: ZCodeBuiltinRelease,
  sourceKey: string,
): ProviderConfigLayerSnapshot {
  return Object.freeze({
    revision: `zcode-builtin:${release.revision}:${sourceKey}`,
    providers: release.config.providers,
    providerTemplates: release.config.providerTemplates,
    models: release.config.modelConfigRules,
  });
}

function signatureOf(release: ZCodeBuiltinRelease): string {
  return `${release.revision}:${serializeZCodeBuiltinRelease(release)}`;
}
