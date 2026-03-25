import type { RequestConfig } from '../types/request';
import type { ResponseData } from '../types/response';
import { replaceVariables } from '../utils/variable';

/**
 * Proxy Handler for bypassing CORS
 */
export class ProxyHandler {
  private static instance: ProxyHandler;
  private activeRules: number[] = [];
  private ruleIdCounter: number = 1;

  private constructor() {}

  static getInstance(): ProxyHandler {
    if (!ProxyHandler.instance) {
      ProxyHandler.instance = new ProxyHandler();
    }
    return ProxyHandler.instance;
  }

  /**
   * Enable CORS bypass for specific patterns
   */
  async enableCorsBypass(patterns: string[]): Promise<void> {
    if (!chrome.declarativeNetRequest) {
      console.warn('declarativeNetRequest API not available');
      return;
    }

    // Remove existing rules
    await this.disableCorsBypass();

    const rules = patterns.map((pattern) => ({
      id: this.ruleIdCounter++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: 'Access-Control-Allow-Origin',
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: 'http://localhost,http://127.0.0.1,http://0.0.0.0',
          },
          {
            header: 'Access-Control-Allow-Methods',
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
          },
          {
            header: 'Access-Control-Allow-Headers',
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Api-Key,X-Client-Version',
          },
          {
            header: 'Access-Control-Allow-Credentials',
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: 'true',
          },
        ],
      },
      condition: {
        urlFilter: pattern,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        ],
      },
    }));

    try {
      await chrome.declarativeNetRequest.updateSessionRules({
        addRules: rules,
      });
      this.activeRules = rules.map((r) => r.id);
    } catch (error) {
      console.error('Failed to enable CORS bypass:', error);
    }
  }

  /**
   * Disable CORS bypass
   */
  async disableCorsBypass(): Promise<void> {
    if (!chrome.declarativeNetRequest) {
      return;
    }

    if (this.activeRules.length > 0) {
      try {
        await chrome.declarativeNetRequest.updateSessionRules({
          removeRuleIds: this.activeRules,
        });
        this.activeRules = [];
      } catch (error) {
        console.error('Failed to disable CORS bypass:', error);
      }
    }
  }

  /**
   * Execute a proxy request through the service worker
   */
  async executeProxyRequest(
    request: RequestConfig,
    environment: Record<string, any>
  ): Promise<ResponseData> {
    const startTime = performance.now();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // Construct URL with query parameters
      let url = request.url;
      if (request.queryParams && request.queryParams.length > 0) {
        const enabledParams = request.queryParams.filter((p) => p.enabled);
        if (enabledParams.length > 0) {
          const params = new URLSearchParams();
          enabledParams.forEach((p) => {
            if (p.key) {
              params.append(p.key, this.replaceVariables(p.value, environment));
            }
          });
          url = `${url}?${params.toString()}`;
        }
      }

      // Replace variables in URL
      url = this.replaceVariables(url, environment);

      // Construct headers
      const headers = new Headers();
      request.headers.forEach((h) => {
        if (h.enabled && h.key) {
          headers.append(
            h.key,
            this.replaceVariables(h.value, environment)
          );
        }
      });

      // Construct body
      let body: string | FormData | undefined = undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = this.constructBody(request, environment);
      }

      // 如果是 FormData，删除 Content-Type 头，让浏览器自动设置（包含 boundary）
      if (body instanceof FormData) {
        headers.delete('Content-Type');
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(
        () => controller.abort(),
        request.timeout || 30000
      );

      // Execute request
      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
        credentials: 'include',
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Parse response
      const responseBody = await this.parseResponseBody(response);

      const endTime = performance.now();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        size: this.calculateSize(responseBody),
        time: Math.round(endTime - startTime),
        timestamp: Date.now(),
        logs: [],
        // 添加请求信息用于生成 curl 命令
        request: {
          method: request.method,
          url: url,
          headers: Object.fromEntries(headers.entries()),
          body: body ? (typeof body === 'string' ? body : undefined) : undefined,
        },
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${request.timeout || 30000}ms`);
      }
      throw error;
    }
  }

  /**
   * Execute a proxy request with abort signal (for cancellation support)
   */
  async executeProxyRequestWithAbort(
    request: RequestConfig,
    environment: Record<string, any>,
    signal: AbortSignal
  ): Promise<ResponseData> {
    const startTime = performance.now();

    console.log('[ProxyHandler] executeProxyRequestWithAbort 收到的环境变量:', JSON.stringify(environment));

    // 监听取消信号
    let isAborted = false;
    const abortHandler = () => {
      isAborted = true;
    };
    signal.addEventListener('abort', abortHandler);

    try {
      // Construct URL with query parameters
      let url = request.url;
      if (request.queryParams && request.queryParams.length > 0) {
        const enabledParams = request.queryParams.filter((p) => p.enabled);
        if (enabledParams.length > 0) {
          const params = new URLSearchParams();
          enabledParams.forEach((p) => {
            if (p.key) {
              params.append(p.key, this.replaceVariables(p.value, environment));
            }
          });
          url = `${url}?${params.toString()}`;
        }
      }

      // Replace variables in URL
      url = this.replaceVariables(url, environment);

      // Construct headers with defaults
      const headers = this.buildHeaders(request.headers, environment);

      // Construct body
      let body: string | FormData | undefined = undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = this.constructBody(request, environment);
      }

      // Create timeout controller linked with abort signal
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(
        () => timeoutController.abort(),
        request.timeout || 30000
      );

      // Link timeout controller abort to main signal
      const timeoutAbortHandler = () => {
        if (!isAborted) {
          signal.removeEventListener('abort', abortHandler);
        }
        clearTimeout(timeoutId);
      };
      timeoutController.signal.addEventListener('abort', timeoutAbortHandler);

      console.log('[PostABC Background] 发送请求:', { url, method: request.method, headers: Object.fromEntries(headers.entries()) });

      // Execute request
      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        signal: AbortSignal.any ? AbortSignal.any([signal, timeoutController.signal]) : signal, // 使用现代浏览器支持的AbortSignal.any，否则回退到主信号
        credentials: 'include',
      });

      clearTimeout(timeoutId);
      signal.removeEventListener('abort', abortHandler);
      timeoutController.signal.removeEventListener('abort', timeoutAbortHandler);

      // Parse response
      const responseBody = await this.parseResponseBody(response);

      const endTime = performance.now();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        size: this.calculateSize(responseBody),
        time: Math.round(endTime - startTime),
        timestamp: Date.now(),
        logs: [],
        // 添加请求信息用于生成 curl 命令
        request: {
          method: request.method,
          url: url,
          headers: Object.fromEntries(headers.entries()),
          body: body ? (typeof body === 'string' ? body : undefined) : undefined,
        },
      };
    } catch (error) {
      signal.removeEventListener('abort', abortHandler);
      if (error instanceof Error && error.name === 'AbortError') {
        if (isAborted) {
          throw new Error('请求已取消');
        }
        throw new Error(`Request timeout after ${request.timeout || 30000}ms`);
      }
      throw error;
    }
  }

  /**
   * Build headers with default values
   */
  private buildHeaders(
    requestHeaders: RequestConfig['headers'],
    environment: Record<string, any>
  ): Headers {
    const headers = new Headers();

    console.log('[ProxyHandler] 构建请求头，环境变量:', environment);

    // 设置默认请求头（仅在用户未指定时才设置）
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    };

    // 先处理用户自定义头（并进行变量替换）
    const userHeaders = new Map<string, string>();
    requestHeaders?.forEach((h) => {
      if (h.enabled && h.key) {
        const originalValue = h.value;
        const replacedValue = this.replaceVariables(h.value, environment);
        console.log(`[ProxyHandler] Header ${h.key}: "${originalValue}" -> "${replacedValue}"`);
        userHeaders.set(h.key.toLowerCase(), replacedValue); // 使用小写键名进行比较
      }
    });

    // 设置默认头，但仅在用户未指定同名头时才设置
    for (const [key, value] of Object.entries(defaultHeaders)) {
      const lowerKey = key.toLowerCase();
      if (!userHeaders.has(lowerKey)) {
        headers.set(key, value);
      }
    }

    // 设置用户自定义头（覆盖默认头）
    for (const [key, value] of userHeaders) {
      // 使用原始大小写的键名，但需要找到原始的键名
      const originalKey = requestHeaders?.find(h => h.key?.toLowerCase() === key)?.key || key;
      headers.set(originalKey, value);
    }

    return headers;
  }

  /**
   * Execute a proxy request with streaming support
   */
  async executeProxyRequestWithStream(
    request: RequestConfig,
    environment: Record<string, any>,
    signal: AbortSignal,
    onStreamData: (data: any) => void
  ): Promise<ResponseData> {
    const startTime = performance.now();

    // 调试：打印收到的环境变量
    console.log('[ProxyHandler] executeProxyRequestWithStream 收到的环境变量:', JSON.stringify(environment));
    console.log('[ProxyHandler] 原始 URL:', request.url);

    // 监听取消信号
    let isAborted = false;
    const abortHandler = () => {
      isAborted = true;
    };
    signal.addEventListener('abort', abortHandler);

    // 创建超时控制器
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      request.timeout || 30000
    );

    // 链接超时和主信号
    const combinedSignal = AbortSignal.any 
      ? AbortSignal.any([signal, timeoutController.signal])
      : signal;

    try {
      // Construct URL with query parameters
      let url = request.url;
      if (request.queryParams && request.queryParams.length > 0) {
        const enabledParams = request.queryParams.filter((p) => p.enabled);
        if (enabledParams.length > 0) {
          const params = new URLSearchParams();
          enabledParams.forEach((p) => {
            if (p.key) {
              const originalValue = p.value;
              const replacedValue = this.replaceVariables(p.value, environment);
              console.log(`[ProxyHandler] QueryParam ${p.key}: "${originalValue}" -> "${replacedValue}"`);
              params.append(p.key, replacedValue);
            }
          });
          url = `${url}?${params.toString()}`;
        }
      }

      // Replace variables in URL
      const originalUrl = url;
      url = this.replaceVariables(url, environment);
      console.log(`[ProxyHandler] URL 替换: "${originalUrl}" -> "${url}"`);

      // Construct headers with defaults
      const headers = this.buildHeaders(request.headers, environment);

      // Construct body
      let body: string | FormData | undefined = undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = this.constructBody(request, environment);
      }

      // 如果是 FormData，删除 Content-Type 头，让浏览器自动设置（包含 boundary）
      if (body instanceof FormData) {
        headers.delete('Content-Type');
      }

      console.log('[PostABC Background] 发送流式请求:', { url, method: request.method, headers: Object.fromEntries(headers.entries()) });

      // Execute request with combined signal
      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        signal: combinedSignal,
        credentials: 'include',
      });

      // Parse response with streaming
      const responseBody = await this.parseResponseBodyWithStream(response, onStreamData, signal);

      const endTime = performance.now();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        size: this.calculateSize(responseBody),
        time: Math.round(endTime - startTime),
        timestamp: Date.now(),
        logs: [],
        // 添加请求信息用于生成 curl 命令
        request: {
          method: request.method,
          url: url,
          headers: Object.fromEntries(headers.entries()),
          body: body ? (typeof body === 'string' ? body : undefined) : undefined,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        if (isAborted) {
          throw new Error('请求已取消');
        } else if (timeoutController.signal.aborted) {
          throw new Error(`请求超时 (${request.timeout || 30000}ms)`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', abortHandler);
    }
  }

  /**
   * Construct request body based on type
   */
  private constructBody(
    request: RequestConfig,
    environment: Record<string, any>
  ): string | FormData {
    switch (request.bodyType) {
      case 'json':
        // JSON body 需要进行变量替换
        const jsonBody = request.body?.json || '{}';
        const replacedJsonBody = this.replaceVariables(jsonBody, environment);
        console.log('[ProxyHandler] JSON Body 变量替换:', { original: jsonBody, replaced: replacedJsonBody });
        return replacedJsonBody;
      case 'raw':
        // Raw body 也需要进行变量替换
        const rawBody = request.body?.raw || '';
        const replacedRawBody = this.replaceVariables(rawBody, environment);
        console.log('[ProxyHandler] Raw Body 变量替换:', { original: rawBody, replaced: replacedRawBody });
        return replacedRawBody;
      case 'urlencoded':
        if (request.body?.urlencoded) {
          const params = new URLSearchParams();
          request.body.urlencoded
            .filter((p) => p.enabled && p.key)
            .forEach((p) => {
              params.append(
                p.key,
                this.replaceVariables(p.value, environment)
              );
            });
          return params.toString();
        }
        return '';
      case 'form-data':
        const formData = new FormData();
        if (request.body?.form) {
          request.body.form
            .filter((f) => f.enabled && f.key)
            .forEach((f) => {
              // 检查是否为文件字段
              if (f.type === 'file' && f.value && typeof f.value === 'string' && f.value.startsWith('file://')) {
                // 对于文件字段，我们不能直接替换变量，因为文件路径不应该被替换
                // 这里只是示例，实际的文件上传需要特殊处理
                formData.append(f.key, f.value);
              } else {
                // 对于文本字段，进行变量替换
                const processedValue = this.replaceVariables(f.value, environment);
                formData.append(f.key, processedValue);
              }
            });
        }
        return formData;
      default:
        return undefined as any;
    }
  }

  /**
   * Parse response body
   */
  private async parseResponseBody(response: Response): Promise<
    ResponseData['body']
  > {
    const contentType = response.headers.get('content-type') || '';

    // Check for SSE
    if (contentType.includes('text/event-stream')) {
      const { SSEStreamHandler } = await import('../core/sse/stream-handler');
      const handler = new SSEStreamHandler({
        onComplete: () => {},
        onProgress: () => {},
      });
      const events = await handler.handleStream(response);
      return {
        type: 'sse',
        content: events,
        raw: events.map((e) => e.data).join('\n'),
      };
    }

    // Check for JSON
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        return {
          type: 'json',
          content: JSON.parse(text),
        };
      } catch {
        const text = await response.text();
        return {
          type: 'json',
          content: text,
        };
      }
    }

    // Default to text
    const text = await response.text();
    return {
      type: 'text',
      content: text,
    };
  }

  /**
   * Parse response body with streaming support
   */
  private async parseResponseBodyWithStream(
    response: Response,
    onStreamData: (data: any) => void,
    signal?: AbortSignal
  ): Promise<ResponseData['body']> {
    const contentType = response.headers.get('content-type') || '';

    console.log('[ProxyHandler] parseResponseBodyWithStream contentType:', contentType);
    console.log('[ProxyHandler] onStreamData callback type:', typeof onStreamData);

    // Check for SSE
    if (contentType.includes('text/event-stream')) {
      const { SSEStreamHandler } = await import('../core/sse/stream-handler');
      const events: any[] = [];

      console.log('[ProxyHandler] Creating SSEStreamHandler for SSE stream');

      const handler = new SSEStreamHandler({
        onData: (event) => {
          // 立即打印日志确认回调被调用
          console.log('[ProxyHandler] onData callback invoked, event id:', event.id, 'signal.aborted:', signal?.aborted);
          
          // 检查是否已取消
          if (signal?.aborted) {
            console.log('[ProxyHandler] Signal aborted, skipping event');
            return;
          }
          events.push(event);
          console.log('[ProxyHandler] Calling onStreamData for event:', event.id);
          onStreamData({ type: 'sse-event', event });
          console.log('[ProxyHandler] onStreamData call completed for event:', event.id);
        },
        onComplete: () => {
          console.log('[ProxyHandler] SSE stream complete, total events:', events.length);
        },
        onProgress: () => {},
      });

      try {
        await handler.handleStream(response, signal);
      } catch (error) {
        // 如果是取消错误，返回已收集的事件
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[ProxyHandler] Stream parsing aborted');
        } else {
          throw error;
        }
      }

      return {
        type: 'sse',
        content: events,
        raw: events.map((e) => e.data).join('\n'),
      };
    }

    // Check for JSON
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        return {
          type: 'json',
          content: JSON.parse(text),
        };
      } catch {
        const text = await response.text();
        return {
          type: 'json',
          content: text,
        };
      }
    }

    // Default to text
    const text = await response.text();
    return {
      type: 'text',
      content: text,
    };
  }

  /**
   * Calculate response size
   */
  private calculateSize(body: ResponseData['body']): number {
    if (typeof body.content === 'string') {
      return new Blob([body.content]).size;
    } else if (Array.isArray(body.content)) {
      return JSON.stringify(body.content).length;
    } else {
      return JSON.stringify(body.content).length;
    }
  }

  /**
   * Replace variables in a string
   */
  private replaceVariables(
    str: string,
    environment: Record<string, any>
  ): string {
    return replaceVariables(str, environment);
  }
}
