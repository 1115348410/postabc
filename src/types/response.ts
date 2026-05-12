import type { SSEEvent } from './sse';

/**
 * Response body types
 */
export type ResponseBodyType = 'json' | 'text' | 'html' | 'xml' | 'sse';

/**
 * Response log entry for console output
 */
export interface ResponseLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  timestamp: number;
}

/**
 * Extracted field from streaming response
 */
export interface ExtractedField {
  path: string;
  alias: string;
  values: any[];
  concatenatedValue?: string;
}

/**
 * Complete response data
 */
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: {
    type: ResponseBodyType;
    content: string | Record<string, any> | SSEEvent[];
    raw?: string;
    extractedFields?: ExtractedField[];
  };
  size: number;
  time: number; // Response time in milliseconds
  timestamp: number;
  logs: ResponseLog[];
  // 请求信息（用于生成 curl 命令）
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    credentials?: "include" | "omit" | "same-origin";
    body?: string;
  };
}

/**
 * Request history item
 */
export interface RequestHistoryItem {
  id: string;
  name: string;
  request: any;
  response?: ResponseData;
  timestamp: number;
  collectionId?: string;
}
