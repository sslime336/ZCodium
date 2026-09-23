import { modelSelectionSchema } from "./model-selection.js";
import { parseSubagentMarkdownSelection } from "./subagent-markdown-selection.js";
import {
  parsePluginSubagentModelSelectionOverrides,
  type BuiltInSubagentModelSelectionOverrides,
  type PluginSubagentModelSelectionOverrides,
} from "./subagents-types.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** 仅存储迁移入口使用；正式 reader 不得再解释旧双 map 或旧 Provider。 */
export function importSubagentStateSelections(input: Record<string, unknown>): Record<
  string,
  unknown
> & {
  builtInModelSelectionOverrides: BuiltInSubagentModelSelectionOverrides;
  pluginAgentModelSelectionOverrides: PluginSubagentModelSelectionOverrides;
} {
  const current = Object.hasOwn(input, "builtInModelSelectionOverrides");
  const selections: BuiltInSubagentModelSelectionOverrides = {};
  for (const name of ["Explore", "general-purpose"] as const) {
    const selection = current
      ? modelSelectionSchema.safeParse(record(input.builtInModelSelectionOverrides)[name]).data
      : parseSubagentMarkdownSelection({
          model: record(input.builtInModelOverrides)[name],
          thoughtLevel: record(input.builtInThoughtLevelOverrides)[name],
        });
    if (!selection) continue;
    // 官方内置 Provider 的旧 ID 重写已随模块删除；这里只解释存储形态，不改写 ID。
    selections[name] = selection;
  }
  // 插件双 map 与内置覆盖一样只在存储导入时解释；
  // 正式 map 存在即为权威，空值/损坏值也不能复活旧 model 或档位。
  const pluginSelections = Object.hasOwn(input, "pluginAgentModelSelectionOverrides")
    ? parsePluginSubagentModelSelectionOverrides(input.pluginAgentModelSelectionOverrides)
    : Object.fromEntries(
        Object.entries(record(input.pluginAgentModelOverrides)).flatMap(([id, model]) => {
          const selection = parseSubagentMarkdownSelection({
            model,
            thoughtLevel: record(input.pluginAgentThoughtLevelOverrides)[id],
          });
          if (!id.startsWith("plugin:") || !selection) return [];
          return [[id, selection]];
        }),
      );
  return {
    ...input,
    builtInModelSelectionOverrides: selections,
    pluginAgentModelSelectionOverrides: pluginSelections,
  };
}
