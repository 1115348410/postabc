/**
 * 变量工具函数
 * 此文件保留向后兼容性，从新模块重新导出
 */

// 从新模块重新导出所有功能
export {
  replaceVariables,
  generateBuiltinVariable,
  extractVariables,
  getRequestVariables,
  getBuiltinVariablesList,
  createVariableContext,
  validateVariableName,
  RESERVED_PREFIXES,
  getAllCategories,
} from './variables';

export type {
  BuiltinVariable,
  VariableContext,
  VariableCategory,
} from './variables';
