import type { BodyType } from '../types';

/**
 * Supported body content types
 */
export const BODY_TYPES: Array<{
  value: BodyType;
  label: string;
  description: string;
}> = [
  {
    value: 'none',
    label: 'No Body',
    description: 'No request body',
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation',
  },
  {
    value: 'form-data',
    label: 'Form Data',
    description: 'Multipart form data',
  },
  {
    value: 'urlencoded',
    label: 'URL Encoded',
    description: 'URL-encoded form data',
  },
  {
    value: 'raw',
    label: 'Raw',
    description: 'Raw text body',
  },
];

/**
 * Default headers for different body types
 */
export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'PostABC/1.0',
};

/**
 * Get default Content-Type header for body type
 */
export function getDefaultContentType(bodyType: BodyType): string {
  switch (bodyType) {
    case 'json':
      return 'application/json';
    case 'form-data':
      return 'multipart/form-data';
    case 'urlencoded':
      return 'application/x-www-form-urlencoded';
    case 'raw':
      return 'text/plain';
    default:
      return '';
  }
}
