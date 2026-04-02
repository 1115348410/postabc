/**
 * HTTP Methods supported by the API client
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

/**
 * Supported body content types
 */
export type BodyType = "none" | "json" | "form-data" | "raw" | "urlencoded";

/**
 * Request header
 */
export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * Request query parameter
 */
export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * Form data field
 */
export interface FormDataField {
  key: string;
  value: string;
  type: "text" | "file";
  enabled: boolean;
  fileData?: {
    name: string;
    type: string;
    data: ArrayBuffer;
  };
}

/**
 * Streaming field extraction rule
 */
export interface StreamExtractionRule {
  /** Field path expression (e.g., "data.choices[0].delta.content") */
  path: string;
  /** Alias name for display */
  alias?: string;
  /** Whether to concatenate values (useful for streaming text) */
  concatenate?: boolean;
}

/**
 * Streaming output configuration
 */
export interface StreamConfig {
  /** Enable streaming mode */
  enabled: boolean;
  /** Field extraction rules */
  extractionRules: StreamExtractionRule[];
  /** Display mode for extracted content */
  displayMode: "concatenated" | "raw" | "both";
}

/**
 * Complete request configuration
 */
export interface RequestConfig {
  id?: string;
  method: HttpMethod;
  url: string;
  headers: RequestHeader[];
  queryParams: QueryParam[];
  bodyType: BodyType;
  body?: {
    json?: string;
    raw?: string;
    form?: FormDataField[];
    urlencoded?: QueryParam[];
  };
  preRequestScript?: string;
  testScript?: string;
  timeout?: number;
  /** Streaming output configuration */
  streamConfig?: StreamConfig;
}

/**
 * Request execution context (for scripts)
 */
export interface RequestContext {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams: Record<string, string>;
}

/**
 * Variable substitution pattern
 */
export const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Request Tab - 表示一个请求标签页
 */
export interface RequestTab {
  id: string;
  name: string;
  request: RequestConfig;
  response?: any;
  isNew?: boolean;
  isModified?: boolean;
  isDirty?: boolean;
  isActive?: boolean;
  // API 保存相关
  apiUuid?: string; // 已保存接口的UUID（编辑模式）
  parentUuid?: string; // 所属文件夹UUID
}

/**
 * HttpRequest - 简化的请求结构，用于同步服务
 */
export interface HttpRequest {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: {
    type: string;
    content: string;
  };
  preRequestScript?: string;
  testScript?: string;
}

/**
 * Default request configuration for new tabs
 */
export const DEFAULT_REQUEST_CONFIG: Omit<RequestConfig, "id"> = {
  method: "GET",
  url: "",
  headers: [
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "Accept", value: "*/*", enabled: true },
  ],
  queryParams: [],
  bodyType: "none",
  timeout: 30000,
  streamConfig: {
    enabled: false,
    extractionRules: [],
    displayMode: "concatenated",
  },
};
