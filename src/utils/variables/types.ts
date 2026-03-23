/**
 * 内置变量类型定义
 */

export interface BuiltinVariable {
  /** 变量标识，如 $timestamp */
  name: string;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 所属分类 */
  category: 'datetime' | 'random' | 'mock';
  /** 是否支持参数 */
  hasParams?: boolean;
  /** 参数格式说明，如 "min:max" */
  paramsFormat?: string;
  /** 参数示例，如 "1:100" */
  paramsExample?: string;
  /** 生成函数 */
  generate: (params?: string, context?: VariableContext) => string;
}

export interface VariableCategory {
  id: 'datetime' | 'random' | 'mock';
  label: string;
  icon: string;
  variables: BuiltinVariable[];
}

export interface VariableContext {
  /** 缓存已生成的变量值 */
  cache: Map<string, string>;
  /** 当前时间戳（确保同一请求内一致） */
  timestamp: number;
}

/**
 * 创建变量上下文
 */
export function createVariableContext(): VariableContext {
  return {
    cache: new Map<string, string>(),
    timestamp: Date.now(),
  };
}
