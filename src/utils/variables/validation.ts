/**
 * 变量名校验函数
 */

/** 保留的变量名前缀 */
export const RESERVED_PREFIXES = ['uv.'];

/**
 * 校验变量名是否有效
 * @param name 变量名
 * @returns 校验结果
 */
export function validateVariableName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: '变量名不能为空' };
  }

  for (const prefix of RESERVED_PREFIXES) {
    if (trimmedName.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        valid: false,
        error: `变量名不能以 "${prefix}" 开头，此前缀保留给脚本动态变量使用`,
      };
    }
  }

  return { valid: true };
}
