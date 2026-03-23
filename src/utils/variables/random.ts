/**
 * 随机数类变量
 */

import type { BuiltinVariable, VariableContext } from './types';

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成随机字符串
 */
function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机整数
 */
function generateRandomInt(min: number = 0, max: number = 1000): number {
  if (min > max) {
    // 无效参数，返回 -1 表示错误
    return -1;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机浮点数
 */
function generateRandomFloat(min: number = 0, max: number = 1): number {
  if (min > max) {
    return NaN;
  }
  return Math.random() * (max - min) + min;
}

/**
 * 生成随机 IPv4 地址
 */
function generateRandomIPv4(): string {
  const parts: number[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(Math.floor(Math.random() * 256));
  }
  return parts.join('.');
}

/**
 * 生成随机 IPv6 地址
 */
function generateRandomIPv6(): string {
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    parts.push(Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'));
  }
  return parts.join(':');
}

/**
 * 获取随机数类变量列表
 */
export function getRandomVariables(context: VariableContext): BuiltinVariable[] {
  return [
    {
      name: '$guid',
      label: 'UUID v4',
      description: 'UUID v4',
      category: 'random',
      generate: () => generateUUID(),
    },
    {
      name: '$uuid',
      label: 'UUID v4',
      description: 'UUID v4（$guid别名）',
      category: 'random',
      generate: () => generateUUID(),
    },
    {
      name: '$randomUuid',
      label: 'UUID v4',
      description: 'UUID v4（$guid别名）',
      category: 'random',
      generate: () => generateUUID(),
    },
    {
      name: '$randomInt',
      label: '随机整数',
      description: '随机整数 (0-1000)',
      category: 'random',
      hasParams: true,
      paramsFormat: 'min:max',
      paramsExample: '1:100',
      generate: (params?: string) => {
        if (!params) {
          return generateRandomInt().toString();
        }
        const parts = params.split(':');
        if (parts.length !== 2) {
          return ''; // 无效参数
        }
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        if (isNaN(min) || isNaN(max)) {
          return ''; // 无效参数
        }
        const result = generateRandomInt(min, max);
        if (result === -1) {
          return ''; // 无效参数（min > max）
        }
        return result.toString();
      },
    },
    {
      name: '$randomFloat',
      label: '随机浮点数',
      description: '随机浮点数 (0-1, 6位精度)',
      category: 'random',
      hasParams: true,
      paramsFormat: 'min:max',
      paramsExample: '1.5:10.5',
      generate: (params?: string) => {
        if (!params) {
          return generateRandomFloat().toFixed(6);
        }
        const parts = params.split(':');
        if (parts.length !== 2) {
          return ''; // 无效参数
        }
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (isNaN(min) || isNaN(max)) {
          return ''; // 无效参数
        }
        const result = generateRandomFloat(min, max);
        if (isNaN(result)) {
          return ''; // 无效参数（min > max）
        }
        return result.toFixed(6);
      },
    },
    {
      name: '$randomString',
      label: '随机字符串',
      description: '随机字符串 (10位, A-Za-z0-9)',
      category: 'random',
      hasParams: true,
      paramsFormat: 'length',
      paramsExample: '16',
      generate: (params?: string) => {
        if (!params) {
          return generateRandomString(10);
        }
        const length = parseInt(params, 10);
        if (isNaN(length) || length < 0) {
          return ''; // 无效参数
        }
        return generateRandomString(length);
      },
    },
    {
      name: '$randomHex',
      label: '随机十六进制',
      description: '随机十六进制字符串',
      category: 'random',
      generate: () => Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    },
    {
      name: '$randomColor',
      label: '随机颜色值',
      description: '随机颜色值',
      category: 'random',
      generate: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    },
    {
      name: '$randomBoolean',
      label: '随机布尔值',
      description: '随机布尔值（字符串 "true" 或 "false"）',
      category: 'random',
      generate: () => Math.random() < 0.5 ? 'true' : 'false',
    },
    {
      name: '$randomIp',
      label: '随机IPv4地址',
      description: '随机IPv4地址',
      category: 'random',
      generate: () => generateRandomIPv4(),
    },
    {
      name: '$randomIpv6',
      label: '随机IPv6地址',
      description: '随机IPv6地址',
      category: 'random',
      generate: () => generateRandomIPv6(),
    },
    {
      name: '$localIp',
      label: '本地IP地址',
      description: '本地IP地址（浏览器环境固定返回 127.0.0.1）',
      category: 'random',
      generate: () => '127.0.0.1',
    },
  ];
}

/**
 * 生成随机变量值
 */
export function generateRandomVariable(
  name: string,
  context: VariableContext
): string | null {
  const lowerName = name.toLowerCase().trim();

  // 处理带参数的变量
  // $randomInt:min:max
  if (lowerName.startsWith('$randomint:')) {
    const parts = lowerName.split(':');
    if (parts.length === 3) {
      const min = parseInt(parts[1], 10);
      const max = parseInt(parts[2], 10);
      if (!isNaN(min) && !isNaN(max)) {
        const result = generateRandomInt(min, max);
        return result === -1 ? null : result.toString();
      }
    }
    return null;
  }

  // $randomString:length
  if (lowerName.startsWith('$randomstring:')) {
    const parts = lowerName.split(':');
    if (parts.length === 2) {
      const length = parseInt(parts[1], 10);
      if (!isNaN(length) && length >= 0) {
        return generateRandomString(length);
      }
    }
    return null;
  }

  // $randomFloat:min:max
  if (lowerName.startsWith('$randomfloat:')) {
    const parts = lowerName.split(':');
    if (parts.length === 3) {
      const min = parseFloat(parts[1]);
      const max = parseFloat(parts[2]);
      if (!isNaN(min) && !isNaN(max)) {
        const result = generateRandomFloat(min, max);
        return isNaN(result) ? null : result.toFixed(6);
      }
    }
    return null;
  }

  // 检查简单变量
  const variables = getRandomVariables(context);
  for (const variable of variables) {
    if (variable.name.toLowerCase() === lowerName) {
      return variable.generate(undefined, context);
    }
  }

  return null;
}
