import type { HttpMethod } from '../types';

/**
 * Supported HTTP methods with display information
 */
export const HTTP_METHODS: Array<{
  value: HttpMethod;
  label: string;
  color: string;
}> = [
  { value: 'GET', label: 'GET', color: 'text-success-400' },
  { value: 'POST', label: 'POST', color: 'text-warning-400' },
  { value: 'PUT', label: 'PUT', color: 'text-primary-400' },
  { value: 'PATCH', label: 'PATCH', color: 'text-primary-400' },
  { value: 'DELETE', label: 'DELETE', color: 'text-danger-400' },
  { value: 'HEAD', label: 'HEAD', color: 'text-gray-400' },
  { value: 'OPTIONS', label: 'OPTIONS', color: 'text-gray-400' },
  { value: 'TRACE', label: 'TRACE', color: 'text-gray-400' },
];

/**
 * Get color class for HTTP method
 */
export function getHttpMethodColor(method: HttpMethod): string {
  const methodInfo = HTTP_METHODS.find(m => m.value === method);
  return methodInfo?.color || 'text-gray-400';
}
