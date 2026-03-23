/**
 * 日期时间类变量
 */

import type { BuiltinVariable, VariableContext } from './types';

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * 获取日期时间类变量列表
 */
export function getDatetimeVariables(context: VariableContext): BuiltinVariable[] {
  const now = new Date(context.timestamp);

  return [
    {
      name: '$timestamp',
      label: '当前时间戳（秒）',
      description: '当前时间戳（秒）',
      category: 'datetime',
      generate: () => Math.floor(context.timestamp / 1000).toString(),
    },
    {
      name: '$timestampMs',
      label: '当前时间戳（毫秒）',
      description: '当前时间戳（毫秒）',
      category: 'datetime',
      generate: () => context.timestamp.toString(),
    },
    {
      name: '$date',
      label: '当前日期',
      description: '当前日期 (YYYY-MM-DD)',
      category: 'datetime',
      generate: () => now.toISOString().split('T')[0],
    },
    {
      name: '$datetime',
      label: '当前日期时间',
      description: '当前日期时间（ISO格式）',
      category: 'datetime',
      generate: () => now.toISOString(),
    },
    {
      name: '$datetimeIso',
      label: 'ISO格式日期时间',
      description: 'ISO格式日期时间',
      category: 'datetime',
      generate: () => now.toISOString(),
    },
    {
      name: '$datetimeRfc',
      label: 'RFC格式日期时间',
      description: 'RFC格式日期时间',
      category: 'datetime',
      generate: () => now.toUTCString(),
    },
    {
      name: '$datetimeLocal',
      label: '本地日期时间',
      description: '本地日期时间',
      category: 'datetime',
      generate: () => {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      },
    },
    {
      name: '$time',
      label: '当前时间',
      description: '当前时间 (HH:mm:ss)',
      category: 'datetime',
      generate: () => now.toTimeString().split(' ')[0],
    },
    {
      name: '$year',
      label: '当前年份',
      description: '当前年份',
      category: 'datetime',
      generate: () => now.getFullYear().toString(),
    },
    {
      name: '$month',
      label: '当前月份',
      description: '当前月份 (01-12)',
      category: 'datetime',
      generate: () => String(now.getMonth() + 1).padStart(2, '0'),
    },
    {
      name: '$day',
      label: '当前日期',
      description: '当前日期 (01-31)',
      category: 'datetime',
      generate: () => String(now.getDate()).padStart(2, '0'),
    },
    {
      name: '$hour',
      label: '当前小时',
      description: '当前小时 (00-23)',
      category: 'datetime',
      generate: () => String(now.getHours()).padStart(2, '0'),
    },
    {
      name: '$minute',
      label: '当前分钟',
      description: '当前分钟 (00-59)',
      category: 'datetime',
      generate: () => String(now.getMinutes()).padStart(2, '0'),
    },
    {
      name: '$second',
      label: '当前秒',
      description: '当前秒 (00-59)',
      category: 'datetime',
      generate: () => String(now.getSeconds()).padStart(2, '0'),
    },
    {
      name: '$weekday',
      label: '星期几',
      description: '星期几 (0-6, 0=周日)',
      category: 'datetime',
      generate: () => now.getDay().toString(),
    },
    {
      name: '$weekdayName',
      label: '星期几名称',
      description: '星期几名称（中文）',
      category: 'datetime',
      generate: () => WEEKDAY_NAMES[now.getDay()],
    },
    {
      name: '$unix',
      label: 'Unix时间戳',
      description: 'Unix时间戳（同$timestamp）',
      category: 'datetime',
      generate: () => Math.floor(context.timestamp / 1000).toString(),
    },
  ];
}

/**
 * 生成日期时间变量值
 */
export function generateDatetimeVariable(
  name: string,
  context: VariableContext
): string | null {
  const lowerName = name.toLowerCase().trim();
  const variables = getDatetimeVariables(context);

  for (const variable of variables) {
    if (variable.name.toLowerCase() === lowerName) {
      return variable.generate(undefined, context);
    }
  }

  return null;
}
