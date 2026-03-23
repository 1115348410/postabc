/**
 * 输入验证工具函数
 */

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证HTTP方法
 */
export function isValidHttpMethod(method: string): boolean {
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
  return validMethods.includes(method.toUpperCase());
}

/**
 * 验证请求头键名
 */
export function isValidHeaderKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // 检查是否包含非法字符
  const invalidChars = /[^\t\x20-\x7e\x80-\xff]/;
  return !invalidChars.test(key);
}

/**
 * 验证请求头值
 */
export function isValidHeaderValue(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // 检查是否包含非法字符（不允许回车换行等控制字符）
  const invalidChars = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
  return !invalidChars.test(value);
}

/**
 * 验证查询参数键名
 */
export function isValidQueryParamKey(key: string): boolean {
  return typeof key === 'string' && key.trim().length > 0;
}

/**
 * 验证查询参数值
 */
export function isValidQueryParamValue(value: string): boolean {
  return typeof value === 'string';
}

/**
 * 验证环境变量名
 */
export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // 检查是否为危险属性名
  const dangerousKeys = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
  ];

  return !dangerousKeys.includes(name.toLowerCase());
}

/**
 * 清理URL - 移除潜在的危险字符
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  // 移除潜在的危险协议
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase().trim();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  return url;
}

/**
 * 清理请求头键名 - 移除潜在的危险字符
 */
export function sanitizeHeaderKey(key: string): string {
  if (typeof key !== 'string') {
    return '';
  }

  // 只保留字母、数字、连字符和下划线
  return key.replace(/[^\w\-]/g, '');
}

/**
 * 清理请求头值 - 移除潜在的危险字符
 */
export function sanitizeHeaderValue(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }

  // 移除控制字符，但保留基本的空白字符
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * 验证整个请求配置
 */
export function validateRequestConfig(request: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证方法
  if (!request.method || !isValidHttpMethod(request.method)) {
    errors.push('Invalid HTTP method');
  }

  // 验证URL
  if (!request.url || !isValidUrl(request.url)) {
    errors.push('Invalid URL');
  }

  // 验证请求头
  if (request.headers && Array.isArray(request.headers)) {
    for (let i = 0; i < request.headers.length; i++) {
      const header = request.headers[i];
      if (header.enabled) {
        if (header.key && !isValidHeaderKey(header.key)) {
          errors.push(`Invalid header key at index ${i}`);
        }
        if (header.value && !isValidHeaderValue(header.value)) {
          errors.push(`Invalid header value at index ${i}`);
        }
      }
    }
  }

  // 验证查询参数
  if (request.queryParams && Array.isArray(request.queryParams)) {
    for (let i = 0; i < request.queryParams.length; i++) {
      const param = request.queryParams[i];
      if (param.enabled) {
        if (param.key && !isValidQueryParamKey(param.key)) {
          errors.push(`Invalid query parameter key at index ${i}`);
        }
        if (param.value && !isValidQueryParamValue(param.value)) {
          errors.push(`Invalid query parameter value at index ${i}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}