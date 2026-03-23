/**
 * Mock 数据变量
 */

import type { BuiltinVariable, VariableContext } from './types';
import {
  CHINESE_SURNAMES,
  CHINESE_GIVEN_NAMES,
  ENGLISH_FIRST_NAMES,
  ENGLISH_LAST_NAMES,
  EMAIL_DOMAINS,
  CITIES,
  PROVINCES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  WORDS,
  ID_CARD_AREA_CODES,
  randomPick,
} from './mock-data';

/**
 * 生成中文姓名
 */
function generateChineseName(): string {
  const surname = randomPick(CHINESE_SURNAMES);
  const givenName = randomPick(CHINESE_GIVEN_NAMES);
  return surname + givenName;
}

/**
 * 生成英文姓名
 */
function generateEnglishName(): string {
  const firstName = randomPick(ENGLISH_FIRST_NAMES);
  const lastName = randomPick(ENGLISH_LAST_NAMES);
  return `${firstName} ${lastName}`;
}

/**
 * 生成随机邮箱
 */
function generateEmail(): string {
  const username = Math.random().toString(36).substring(2, 10);
  const domain = randomPick(EMAIL_DOMAINS);
  return `${username}@${domain}`;
}

/**
 * 生成随机手机号
 */
function generatePhone(): string {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '170', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = randomPick(prefixes);
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

/**
 * 生成随机身份证号
 */
function generateIdCard(): string {
  // 1. 随机地区码 (6位)
  const areaCode = randomPick(ID_CARD_AREA_CODES);

  // 2. 随机出生日期 (8位)
  const year = 1950 + Math.floor(Math.random() * 60);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const birthDate = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;

  // 3. 随机顺序码 (3位)
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // 4. 计算校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const base = areaCode + birthDate + sequence;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(base[i]) * weights[i];
  }
  const checkCode = checkCodes[sum % 11];

  return base + checkCode;
}

/**
 * 生成随机地址
 */
function generateAddress(): string {
  const province = randomPick(PROVINCES);
  const city = randomPick(CITIES);
  const street = Math.floor(Math.random() * 100) + 1;
  const number = Math.floor(Math.random() * 1000) + 1;
  return `${province}${city}某某路${street}号${number}室`;
}

/**
 * 生成随机公司名
 */
function generateCompany(): string {
  const prefix = randomPick(COMPANY_PREFIXES);
  const suffix = randomPick(COMPANY_SUFFIXES);
  return prefix + suffix;
}

/**
 * 生成随机句子
 */
function generateSentence(): string {
  const word = randomPick(WORDS);
  const templates = [
    `这是一个关于${word}的测试。`,
    `系统正在进行${word}操作。`,
    `该项目包含${word}功能模块。`,
    `用户请求了${word}服务。`,
    `我们完成了${word}的开发工作。`,
  ];
  return randomPick(templates);
}

/**
 * 获取 Mock 数据变量列表
 */
export function getMockVariables(context: VariableContext): BuiltinVariable[] {
  return [
    {
      name: '$mock.name',
      label: '随机中文姓名',
      description: '随机中文姓名',
      category: 'mock',
      generate: () => generateChineseName(),
    },
    {
      name: '$mock.nameEn',
      label: '随机英文姓名',
      description: '随机英文姓名',
      category: 'mock',
      generate: () => generateEnglishName(),
    },
    {
      name: '$mock.firstName',
      label: '随机中文姓',
      description: '随机中文姓',
      category: 'mock',
      generate: () => randomPick(CHINESE_SURNAMES),
    },
    {
      name: '$mock.lastName',
      label: '随机中文名',
      description: '随机中文名',
      category: 'mock',
      generate: () => randomPick(CHINESE_GIVEN_NAMES),
    },
    {
      name: '$mock.email',
      label: '随机邮箱',
      description: '随机邮箱',
      category: 'mock',
      generate: () => generateEmail(),
    },
    {
      name: '$mock.phone',
      label: '随机手机号',
      description: '随机手机号',
      category: 'mock',
      generate: () => generatePhone(),
    },
    {
      name: '$mock.idCard',
      label: '随机身份证号',
      description: '随机身份证号（18位）',
      category: 'mock',
      generate: () => generateIdCard(),
    },
    {
      name: '$mock.address',
      label: '随机中文地址',
      description: '随机中文地址',
      category: 'mock',
      generate: () => generateAddress(),
    },
    {
      name: '$mock.city',
      label: '随机城市',
      description: '随机城市',
      category: 'mock',
      generate: () => randomPick(CITIES),
    },
    {
      name: '$mock.province',
      label: '随机省份',
      description: '随机省份',
      category: 'mock',
      generate: () => randomPick(PROVINCES),
    },
    {
      name: '$mock.company',
      label: '随机公司名',
      description: '随机公司名',
      category: 'mock',
      generate: () => generateCompany(),
    },
    {
      name: '$mock.word',
      label: '随机词语',
      description: '随机词语',
      category: 'mock',
      generate: () => randomPick(WORDS),
    },
    {
      name: '$mock.sentence',
      label: '随机句子',
      description: '随机句子',
      category: 'mock',
      generate: () => generateSentence(),
    },
  ];
}

/**
 * 生成 Mock 变量值
 */
export function generateMockVariable(
  name: string,
  context: VariableContext
): string | null {
  const lowerName = name.toLowerCase().trim();
  const variables = getMockVariables(context);

  for (const variable of variables) {
    if (variable.name.toLowerCase() === lowerName) {
      return variable.generate(undefined, context);
    }
  }

  return null;
}