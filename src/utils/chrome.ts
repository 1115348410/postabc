/**
 * Chrome Runtime utilities
 */

/**
 * Check if chrome runtime is available
 */
export function isRuntimeAvailable(): boolean {
  const available = typeof chrome !== 'undefined' &&
         chrome.runtime !== undefined &&
         typeof chrome.runtime.sendMessage === 'function';
  console.log('[PostABC] Chrome runtime available:', available);
  return available;
}

/**
 * Send message to background script
 */
export async function sendMessageToBackground<T = any>(
  type: string,
  payload?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  // 检查 chrome.runtime 是否可用
  if (!isRuntimeAvailable()) {
    console.error('[PostABC] Chrome runtime 不可用');
    return {
      success: false,
      error: '扩展上下文不可用，请确保从扩展图标打开此页面',
    };
  }

  return new Promise((resolve) => {
    console.log('[PostABC] 发送消息到 background:', type);
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[PostABC] 消息发送失败:', chrome.runtime.lastError.message);
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        console.log('[PostABC] 收到响应:', response);
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

// 存储当前请求的端口连接，用于取消请求
const activePorts = new Map<string, { port: chrome.runtime.Port; timeoutId?: ReturnType<typeof setTimeout> }>();

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send proxy request with streaming support
 */
export async function sendProxyRequest(
  request: any,
  environment: Record<string, any>,
  onStreamData?: (data: any) => void
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('[PostABC] sendProxyRequest called, checking runtime...');

  // 检查 chrome.runtime 是否可用
  if (!isRuntimeAvailable()) {
    return {
      success: false,
      error: '扩展上下文不可用，请确保从扩展图标打开此页面',
    };
  }

  // 生成请求ID用于取消
  const requestId = generateRequestId();
  console.log('[PostABC] Generated request ID:', requestId);

  // 所有请求都使用 Port 连接以支持取消
  return new Promise((resolve) => {
    try {
      // 关闭之前的同ID连接
      if (activePorts.has(requestId)) {
        console.log('[PostABC] Disconnecting previous port for same request ID');
        const { port, timeoutId } = activePorts.get(requestId)!;
        port.disconnect();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        activePorts.delete(requestId);
      }

      console.log('[PostABC] Creating new port connection...');
      const port = chrome.runtime.connect({ name: 'proxy-request' });
      activePorts.set(requestId, { port });
      console.log('[PostABC] Port created:', port.name);

      let isResolved = false;
      let isCancelled = false;

      // 设置一个超时清理机制，防止端口未正确清理
      const timeoutId = setTimeout(() => {
        if (activePorts.has(requestId) && !isResolved) {
          console.warn('[PostABC] Port cleanup timeout, disconnecting port');
          const portInfo = activePorts.get(requestId)!;
          portInfo.port.disconnect();
          activePorts.delete(requestId);
        }
      }, 120000); // 2分钟超时

      // 更新存储的端口信息，包含超时ID
      activePorts.set(requestId, { port, timeoutId });

      // 保存取消状态的检查函数
      (port as any).markAsCancelled = () => {
        isCancelled = true;
      };

      const messageListener = (message: any) => {
        console.log('[PostABC] Port message received:', message.type, 'timestamp:', Date.now());

        if (message.type === 'stream-data') {
          // 流式数据
          console.log('[PostABC] Stream data received, type:', message.data?.type, 'eventTimestamp:', message.data?.event?.timestamp);
          if (onStreamData) {
            onStreamData(message.data);
          }
        } else if (message.type === 'complete') {
          // 请求完成
          if (!isResolved) {
            isResolved = true;
            // 清理端口和超时ID
            const portInfo = activePorts.get(requestId);
            if (portInfo && portInfo.timeoutId) {
              clearTimeout(portInfo.timeoutId);
            }
            activePorts.delete(requestId);
            port.onMessage.removeListener(messageListener);
            resolve({ success: true, data: message.data });
          }
        } else if (message.type === 'error') {
          // 请求错误
          if (!isResolved) {
            isResolved = true;
            // 清理端口和超时ID
            const portInfo = activePorts.get(requestId);
            if (portInfo && portInfo.timeoutId) {
              clearTimeout(portInfo.timeoutId);
            }
            activePorts.delete(requestId);
            port.onMessage.removeListener(messageListener);
            resolve({ success: false, error: message.error });
          }
        }
      };

      port.onMessage.addListener(messageListener);

      const disconnectListener = () => {
        console.log('[PostABC] Port disconnected, isCancelled:', isCancelled);
        if (activePorts.has(requestId) && !isResolved) {
          isResolved = true;
          // 清理端口和超时ID
          const portInfo = activePorts.get(requestId)!;
          if (portInfo.timeoutId) {
            clearTimeout(portInfo.timeoutId);
          }
          // 如果是取消导致的断开，返回特定的取消错误
          if (isCancelled) {
            resolve({ success: false, error: '请求已取消' });
          } else if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: false, error: '连接已断开' });
          }
          activePorts.delete(requestId);
          port.onMessage.removeListener(messageListener);
        }
      };

      port.onDisconnect.addListener(disconnectListener);

      // 发送请求
      console.log('[PostABC] Sending PROXY_REQUEST message...');
      console.log('[PostABC] 发送的 environment:', JSON.stringify(environment));
      port.postMessage({
        type: 'PROXY_REQUEST',
        payload: { request, environment, requestId }
      });

    } catch (error) {
      console.error('[PostABC] Error creating port:', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

/**
 * Cancel current streaming request
 */
export function cancelCurrentRequest(): void {
  console.log('[PostABC] Cancel request called, active ports:', activePorts.size);
  // 取消所有活跃的请求
  for (const [requestId, portInfo] of activePorts) {
    try {
      const { port, timeoutId } = portInfo;
      // 标记为取消状态
      (port as any).markAsCancelled?.();
      port.postMessage({ type: 'CANCEL', payload: { requestId } });
      port.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (e) {
      console.error('[PostABC] Error canceling request:', e);
    }
    activePorts.delete(requestId);
  }
}

/**
 * Enable CORS bypass
 */
export async function enableCorsBypass(patterns: string[]) {
  return sendMessageToBackground('ENABLE_CORS_BYPASS', { patterns });
}

/**
 * Disable CORS bypass
 */
export async function disableCorsBypass() {
  return sendMessageToBackground('DISABLE_CORS_BYPASS');
}
