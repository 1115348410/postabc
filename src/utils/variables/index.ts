/**
 * 变量工具函数 - 统一入口
 * 支持环境变量和内置动态变量
 */

import type { BuiltinVariable, VariableContext, VariableCategory } from './types';
import { createVariableContext } from './types';
import { getDatetimeVariables, generateDatetimeVariable } from './datetime';
import { getRandomVariables, generateRandomVariable } from './random';
import { getMockVariables, generateMockVariable } from './mock';

// 重新导出类型和工具函数
export type { BuiltinVariable, VariableContext, VariableCategory } from './types';
export { createVariableContext } from './types';
export { validateVariableName, RESERVED_PREFIXES } from './validation';

/**
 * 检查是否为危险的属性名（防止原型污染）
 */
function isDangerousProperty(key: string): boolean {
  const dangerousKeys = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
  ];
  return dangerousKeys.includes(key.toLowerCase());
}

/**
 * 生成内置变量值
 * @param name 变量名（不含 {{ }}）
 * @param context 变量上下文
 * @returns 变量值，如果不是内置变量则返回 null
 */
export function generateBuiltinVariable(
  name: string,
  context: VariableContext
): string | null {
  const lowerName = name.toLowerCase().trim();

  // 1. 尝试日期时间变量
  const datetimeValue = generateDatetimeVariable(name, context);
  if (datetimeValue !== null) {
    return datetimeValue;
  }

  // 2. 尝试随机变量
  const randomValue = generateRandomVariable(name, context);
  if (randomValue !== null) {
    return randomValue;
  }

  // 3. 尝试 Mock 变量
  const mockValue = generateMockVariable(name, context);
  if (mockValue !== null) {
    return mockValue;
  }

  return null;
}

/**
 * 替换字符串中的所有变量（包括内置变量和环境变量）
 * @param str 原始字符串
 * @param variables 环境变量对象
 * @param context 可选的变量上下文（用于缓存）
 * @returns 替换后的字符串
 */
export function replaceVariables(
  str: string,
  variables: Record<string, any>,
  context?: VariableContext
): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  // 创建或使用现有上下文
  const ctx = context || createVariableContext();

  // 调试：检查是否包含变量占位符
  const hasVariables = str.includes('{{');
  if (hasVariables) {
    console.log(`[Variable] 开始替换，原始字符串: "${str}"`);
    console.log(`[Variable] 可用环境变量:`, variables ? Object.keys(variables) : 'null');
  }

  return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const lowerKey = trimmedKey.toLowerCase();

    console.log(`[Variable] 找到变量占位符: {{${trimmedKey}}}`);

    // 检查是否为危险属性
    if (isDangerousProperty(trimmedKey)) {
      console.warn(`[Variable] 检测到危险属性访问: {{${trimmedKey}}}, 已阻止`);
      return match; // 保留原始变量格式
    }

    // 1. 检查缓存
    if (ctx.cache.has(lowerKey)) {
      const cachedValue = ctx.cache.get(lowerKey)!;
      console.log(`[Variable] 使用缓存值: {{${trimmedKey}}} -> "${cachedValue}"`);
      return cachedValue;
    }

    // 2. 尝试内置变量
    const builtinValue = generateBuiltinVariable(trimmedKey, ctx);
    if (builtinValue !== null) {
      console.log(`[Variable] 内置变量替换: {{${trimmedKey}}} -> "${builtinValue}"`);
      ctx.cache.set(lowerKey, builtinValue);
      return builtinValue;
    }

    // 3. 尝试环境变量
    if (variables && variables[trimmedKey] !== undefined && variables[trimmedKey] !== null) {
      const value = String(variables[trimmedKey]);
      console.log(`[Variable] 环境变量替换成功: {{${trimmedKey}}} -> "${value}"`);
      ctx.cache.set(lowerKey, value);
      return value;
    }

    // 4. 变量未找到，保留原样
    console.warn(`[Variable] 变量未找到: {{${trimmedKey}}}，可用变量:`, Object.keys(variables || {}));
    return match;
  });
}

/**
 * Extract variable names from a string
 */
export function extractVariables(str: string): string[] {
  const matches = str.matchAll(/\{\{([^}]+)\}\}/g);
  return Array.from(matches).map((m) => m[1].trim());
}

/**
 * Get all unique variables from a request
 */
export function getRequestVariables(request: any): string[] {
  const variables = new Set<string>();

  // Extract from URL
  if (request.url) {
    extractVariables(request.url).forEach((v) => variables.add(v));
  }

  // Extract from headers
  if (request.headers) {
    request.headers.forEach((h: any) => {
      if (h.enabled && h.value) {
        extractVariables(h.value).forEach((v) => variables.add(v));
      }
    });
  }

  // Extract from query params
  if (request.queryParams) {
    request.queryParams.forEach((p: any) => {
      if (p.enabled && p.value) {
        extractVariables(p.value).forEach((v) => variables.add(v));
      }
    });
  }

  // Extract from body
  if (request.body) {
    const { json, raw } = request.body;
    if (json) {
      extractVariables(json).forEach((v) => variables.add(v));
    }
    if (raw) {
      extractVariables(raw).forEach((v) => variables.add(v));
    }
  }

  return Array.from(variables);
}

/**
 * 获取所有变量分类
 */
export function getAllCategories(context?: VariableContext): VariableCategory[] {
  const ctx = context || createVariableContext();

  return [
    {
      id: 'datetime',
      label: '日期时间',
      icon: '📅',
      variables: getDatetimeVariables(ctx),
    },
    {
      id: 'random',
      label: '随机数',
      icon: '🎲',
      variables: getRandomVariables(ctx),
    },
    {
      id: 'mock',
      label: 'Mock 数据',
      icon: '👤',
      variables: getMockVariables(ctx),
    },
  ];
}

/**
 * 获取所有支持的内置变量列表
 */
export function getBuiltinVariablesList(): { name: string; description: string; example: string }[] {
  const context = createVariableContext();
  const categories = getAllCategories(context);
  const result: { name: string; description: string; example: string }[] = [];

  for (const category of categories) {
    for (const variable of category.variables) {
      result.push({
        name: `{{${variable.name}}}`,
        description: variable.description,
        example: variable.generate(variable.paramsExample, context),
      });
    }
  }

  return result;
}
