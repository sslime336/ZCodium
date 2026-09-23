/* 官方内置账号 Provider（zai/bigmodel Coding Plan、Start Plan）的 ID 常量与判定
   helper 已随官方平台物理删除；这里仅保留通用的模型连通性结果类型。 */

/** 一个正式 Model 的连通性测试结果。 */
export type ModelConnectivityResult =
  | { readonly success: true }
  | {
      readonly success: false;
      readonly error: {
        readonly message: string;
        /** 设置连接测试边界已确认的资格失败；其他执行错误保留原消息。 */
        readonly code?: "provider-unavailable" | "model-unavailable";
      };
    };
