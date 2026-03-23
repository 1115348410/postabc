import { ProxyHandler } from './proxy-handler';

/**
 * Background Service Worker
 */

const proxyHandler = ProxyHandler.getInstance();

// 存储活跃的端口连接和对应的 AbortController
const activeConnections = new Map<string, { port: chrome.runtime.Port; abortController: AbortController }>();

// Listen for messages from DevTools panel (非流式请求)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROXY_REQUEST') {
    proxyHandler
      .executeProxyRequest(message.payload.request, message.payload.environment)
      .then((response) => {
        sendResponse({ success: true, data: response });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'ENABLE_CORS_BYPASS') {
    proxyHandler
      .enableCorsBypass(message.payload.patterns)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  if (message.type === 'DISABLE_CORS_BYPASS') {
    proxyHandler.disableCorsBypass().then(() => {
      sendResponse({ success: true });
    });

    return true;
  }
});

// Listen for Port connections from DevTools panel (流式请求支持)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'proxy-request') {
    return;
  }

  console.log('[PostABC Background] Port connected:', port.name);

  const messageListener = async (message: any) => {
    if (message.type === 'PROXY_REQUEST') {
      const { request, environment, requestId } = message.payload;
      console.log('[PostABC Background] 收到流式请求:', { requestId, url: request.url });
      console.log('[PostABC Background] environment 详细信息:', JSON.stringify(environment, null, 2));
      console.log('[PostABC Background] environment keys:', environment ? Object.keys(environment) : 'null');

      // 创建 AbortController 用于取消请求
      const abortController = new AbortController();
      activeConnections.set(requestId, { port, abortController });

      // 创建流式数据回调函数
      const streamDataCallback = (data: any) => {
        console.log('[PostABC Background] streamDataCallback 被调用, data.type:', data.type, 'eventId:', data.event?.id);
        // 实时发送流式数据到前端
        try {
          console.log('[PostABC Background] 准备发送 stream-data 消息...');
          port.postMessage({ type: 'stream-data', data });
          console.log('[PostABC Background] 发送流式数据成功:', data.type, 'eventId:', data.event?.id || Date.now());
        } catch (e) {
          console.error('[PostABC Background] 发送流式数据失败:', e);
        }
      };

      console.log('[PostABC Background] 创建了 streamDataCallback, 类型:', typeof streamDataCallback);

      try {
        // 始终使用流式方法，根据响应的 Content-Type 自动判断是否为 SSE 流
        // 这样可以正确处理服务端返回的 SSE 流，无论请求头是否设置 Accept
        const response = await proxyHandler.executeProxyRequestWithStream(
          request,
          environment || {},
          abortController.signal,
          streamDataCallback
        );

        // 发送完成响应
        port.postMessage({ type: 'complete', data: response });
        console.log('[PostABC Background] 请求完成:', requestId);
      } catch (error) {
        console.error('[PostABC Background] 请求错误:', error);
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        activeConnections.delete(requestId);
      }
    } else if (message.type === 'CANCEL') {
      // 取消请求
      const { requestId } = message.payload || {};
      if (requestId && activeConnections.has(requestId)) {
        const conn = activeConnections.get(requestId)!;
        conn.abortController.abort();
        activeConnections.delete(requestId);
        console.log('[PostABC Background] 请求已取消:', requestId);
      }
    }
  };

  // 监听端口消息
  port.onMessage.addListener(messageListener);

  // 监听端口断开
  port.onDisconnect.addListener(() => {
    console.log('[PostABC Background] Port disconnected');
    // 取消所有与此端口相关的请求
    for (const [requestId, conn] of activeConnections) {
      if (conn.port === port) {
        conn.abortController.abort();
        activeConnections.delete(requestId);
        console.log('[PostABC Background] 取消请求:', requestId);
      }
    }
  });
});

console.log('[PostABC Background] Service worker initialized');
