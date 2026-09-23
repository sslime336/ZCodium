import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type {
  AccountProviderConnectionResolver,
  AccountProviderConnectionResult,
  ProviderConfigSnapshot,
  ProviderSource,
} from "@zcode/provider";
import { AccountProviderService, createAccountProviderConfigResolver } from "@zcode/provider";
import type {
  ProviderFamilyConnectionSelectionSettings,
  ProviderFamilyDomain,
  ZCodeAccountAccess,
  ZCodeProviderAccountAccess,
} from "@zcode/shared";

export interface AccountProviderConnectionSettings {
  readonly providerFamilyDomain: ProviderFamilyDomain | null;
  readonly selections: ProviderFamilyConnectionSelectionSettings;
  /** Host 旧连接导入尚不能确定身份；仅运行时事实，不写入配置或协议。 */
  readonly unresolvedFamilies?: readonly ProviderFamilyDomain[];
}

export interface AccountProviderConnectionResolverOptions {
  readonly readSettings: () => Promise<AccountProviderConnectionSettings>;
  readonly loadAccountIdentity: (family: ProviderFamilyDomain) => Promise<string | null>;
}

export interface AccountProviderConfigSourceOptions extends AccountProviderConnectionResolverOptions {
  readonly configSource: ProviderSource<ProviderConfigSnapshot>;
}

/**
 * 把现有账号域与连接模式投影为领域层 Connection Result。
 *
 * 官方 Coding Plan 权益查询已随 A 层删除，账号连接统一按"未确定"（unknown）发布，
 * 由 @zcode/provider 的 last-known-good 语义处理；Start/Team 的凭据链不再在此解析。
 */
export function createAccountProviderConnectionResolver(
  options: AccountProviderConnectionResolverOptions,
): AccountProviderConnectionResolver {
  let previousScopes = new Map<string, string>();
  return async ({ configuredProviders }) => {
    const settings = structuredClone(await options.readSettings());
    const accountIdentityByFamily = new Map<ProviderFamilyDomain, Promise<string | null>>();
    const loadAccountIdentity = (family: ProviderFamilyDomain) => {
      const existing = accountIdentityByFamily.get(family);
      if (existing) return existing;
      const pending = options.loadAccountIdentity(family).then((identity) => {
        const normalized = identity?.trim() ?? "";
        return normalized || null;
      });
      accountIdentityByFamily.set(family, pending);
      return pending;
    };

    const connections: AccountProviderConnectionResult[] = [];
    const scopes = new Map<string, string>();
    for (const [providerId, config] of configuredProviders.entries()) {
      const access = config.access;
      if (access?.type !== "zhipu-account") continue;
      if (!access.accountType || !access.mode) {
        connections.push({ providerId, status: "unavailable" });
        continue;
      }
      const selection = settings.selections[access.accountType];
      // last-known-good 只对同账号、同 Team 身份成立。切账号后的网络失败不能复活旧权益。
      const scope = JSON.stringify([
        await loadAccountIdentity(access.accountType),
        access.mode === "team-coding-plan" && selection?.kind === "team-coding-plan"
          ? [selection.organizationId, selection.projectId, selection.productId]
          : null,
      ]);
      scopes.set(providerId, scope);
      const resetPrevious =
        previousScopes.has(providerId) && previousScopes.get(providerId) !== scope;
      if (access.mode === "off-peak") {
        // off-peak 依赖付费 Coding Plan 可用性证明；权益查询删除后无法再判定可用。
        connections.push({
          providerId,
          status: "unavailable",
        });
        continue;
      }
      connections.push({
        providerId,
        status: "unknown",
        // Start 跟随登录身份，付费套餐跟随连接选择；两者可同时 current，不改写配置。
        current:
          settings.providerFamilyDomain === access.accountType &&
          (access.mode === "start-plan"
            ? Boolean(await loadAccountIdentity(access.accountType))
            : selection?.kind === access.mode),
        // 两个 Team 共用 Provider ID，观察器必须按同一快照中的完整身份比较，
        // 不能把手动换套餐/账号误当成原套餐失效。它只进入 Account State，不进入 Config。
        connectionKey: createHash("sha256")
          .update(
            JSON.stringify([
              await loadAccountIdentity(access.accountType),
              access.accountType,
              access.mode === "start-plan" ? { kind: "start-plan" } : (selection ?? null),
            ]),
          )
          .digest("hex"),
        ...(resetPrevious ? { resetPrevious: true } : {}),
      });
    }
    // 解析可能跨越切账号，旧设置与新身份会被拼成可发布结果。
    // 发布前核对本轮作用域；失败时也不能推进 previousScopes，否则下一轮会把
    // 未发布的账号误认作 last-known-good。
    const identitiesUnchanged = await Promise.all(
      [...accountIdentityByFamily].map(
        async ([family, captured]) =>
          (await captured) === ((await options.loadAccountIdentity(family))?.trim() || null),
      ),
    );
    if (
      identitiesUnchanged.some((unchanged) => !unchanged) ||
      !isDeepStrictEqual(settings, await options.readSettings())
    ) {
      throw new Error("账号查询期间连接或身份发生变化，丢弃过期结果");
    }
    previousScopes = scopes;
    return Object.freeze(connections);
  };
}

/** 组装 Config、账号连接解析与第三层 Account Provider Config Source。 */
export function createAccountProviderConfigSource(
  options: AccountProviderConfigSourceOptions,
): AccountProviderService {
  return new AccountProviderService({
    configSource: options.configSource,
    resolve: createAccountProviderConfigResolver(createAccountProviderConnectionResolver(options)),
  });
}

/**
 * 把 Active Model 的静态 Access 约束投影到当前账号连接。
 *
 * Team scope 和账号版本不能冻结进 Model：账号切换后旧 Model 会错误失效。
 * 每次请求重新读取当前选择；只有 family 与 mode 兼容时才返回动态访问事实。
 */
export async function resolveCurrentAccountAccess(input: {
  readonly access: ZCodeProviderAccountAccess;
  readonly readSettings: () => Promise<AccountProviderConnectionSettings>;
  readonly loadAccountIdentity: (family: ProviderFamilyDomain) => Promise<string | null>;
}): Promise<ZCodeAccountAccess | null> {
  const settings = await input.readSettings();
  const { accountType, mode } = input.access;
  if (settings.providerFamilyDomain !== accountType) return null;
  if (mode === "start-plan") {
    if (!(await input.loadAccountIdentity(accountType))?.trim()) return null;
    return { type: "zhipu-account", family: accountType, planKind: "start-plan" };
  }
  const selection = settings.selections[accountType];
  if (!selection) return null;
  if (mode === "off-peak") {
    if (selection.kind !== "individual-coding-plan" && selection.kind !== "team-coding-plan") {
      return null;
    }
  } else if (selection.kind !== mode) {
    return null;
  }
  if (!(await input.loadAccountIdentity(accountType))?.trim()) return null;
  if (selection.kind === "team-coding-plan") {
    return {
      type: "zhipu-account",
      family: accountType,
      planKind: selection.kind,
      productId: selection.productId,
      organizationId: selection.organizationId,
      projectId: selection.projectId,
    };
  }
  return {
    type: "zhipu-account",
    family: accountType,
    planKind: selection.kind,
  };
}
