import React, { useState, useEffect } from 'react';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

// 使用 chrome.storage 保存配置（持久化）
const saveServerConfig = async (baseUrl: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ postabc_server_config: { baseUrl, enabled: true } }, resolve);
    } else {
      // 回退到 localStorage
      localStorage.setItem('postabc_server_config', JSON.stringify({ baseUrl, enabled: true }));
      resolve();
    }
  });
};

const loadServerConfig = async (): Promise<{ baseUrl: string; enabled: boolean } | null> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['postabc_server_config'], (result) => {
        resolve(result.postabc_server_config || null);
      });
    } else {
      // 回退到 localStorage
      const stored = localStorage.getItem('postabc_server_config');
      resolve(stored ? JSON.parse(stored) : null);
    }
  });
};

export default function ServerConfigModal({ isOpen, onClose, onSave }: ServerConfigModalProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    const config = await loadServerConfig();
    if (config) {
      setBaseUrl(config.baseUrl);
    }
  };


  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      alert('请先输入服务端地址');
      return;
    }

    // 验证URL格式
    try {
      new URL(baseUrl);
    } catch {
      alert('请输入有效的URL地址，例如：http://localhost:8080');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl.trim()}/api-info/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setTestResult({ success: true, message: '连接成功！' });
        // 测试成功后自动保存并关闭
        await saveServerConfig(baseUrl.trim());
        onSave?.();
        onClose();
      } else {
        setTestResult({ success: false, message: `连接失败：HTTP ${response.status}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: `连接失败：${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">服务端基础地址</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            title="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          <div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              输入后端服务的基础地址，例如：http://localhost:8080
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded text-sm ${
                testResult.success
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
