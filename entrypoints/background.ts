// Background service worker for Chrome extension
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  console.log('[PostABC Background] Service worker starting...');

  // 存储活跃的 AbortController
  const activeControllers = new Map<string, AbortController>();

  // 处理 Port 连接（用于流式请求和取消请求）
  chrome.runtime.onConnect.addListener((port) => {
    console.log('[PostABC Background] Port connected:', port.name);

    if (port.name === 'proxy-request') {
      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      activeControllers.set(requestId, controller);
      console.log('[PostABC Background] Created controller for request:', requestId);

      port.onMessage.addListener(async (message) => {
        console.log('[PostABC Background] Received message:', message.type);

        if (message.type === 'PROXY_REQUEST') {
          const reqId = message.payload.requestId || requestId;
          console.log('[PostABC Background] Processing PROXY_REQUEST:', reqId);
          console.log('[PostABC Background] Request URL:', message.payload.request?.url);
          console.log('[PostABC Background] Environment variables:', JSON.stringify(message.payload.environment));
          console.log('[PostABC Background] Environment keys:', Object.keys(message.payload.environment || {}));

          try {
            // 始终使用流式方法，根据响应的 Content-Type 自动判断是否为 SSE 流
            // 这样可以正确处理服务端返回的 SSE 流，无论请求头是否设置 Accept
            const { ProxyHandler } = await import('../src/background/proxy-handler');
            const proxyHandler = ProxyHandler.getInstance();

            const response = await proxyHandler.executeProxyRequestWithStream(
              message.payload.request,
              message.payload.environment || {},
              controller.signal,
              (data) => {
                // 流式数据回调
                try {
                  port.postMessage({ type: 'stream-data', data });
                } catch (e) {
                  console.error('[PostABC Background] Error sending stream data:', e);
                }
              }
            );

            console.log('[PostABC Background] Request completed, status:', response?.status);
            try {
              port.postMessage({ type: 'complete', data: response });
            } catch (e) {
              console.error('[PostABC Background] Error sending complete:', e);
            }
          } catch (error) {
            console.error('[PostABC Background] Request error:', error);
            try {
              port.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
              });
            } catch (e) {
              console.error('[PostABC Background] Error sending error:', e);
            }
          } finally {
            activeControllers.delete(reqId);
          }
        } else if (message.type === 'CANCEL') {
          console.log('[PostABC Background] Cancel request received');
          controller.abort();
          activeControllers.delete(requestId);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('[PostABC Background] Port disconnected for request:', requestId);
        controller.abort();
        activeControllers.delete(requestId);
      });
    }
  });

  console.log('[PostABC Background] Service worker initialized');
});
