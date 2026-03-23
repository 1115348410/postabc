import React, { useState, useEffect } from 'react';
import { storageAPI } from '../storage/indexed-db';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    const config = await storageAPI.getServerConfig();
    if (config) {
      setBaseUrl(config.baseUrl);
      setEnabled(Boolean(config.enabled));
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      alert('请输入服务端地址');
      return;
    }

    // 确保URL格式正确
    let url = baseUrl.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    await storageAPI.setServerConfig(url, enabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      alert('请先输入服务端地址');
      return;
    }

    let url = baseUrl.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    try {
      const response = await fetch(`${url}/api-info/env`);
      const data = await response.json();
      if (data.code === 200) {
        alert('连接成功！');
      } else {
        alert(`连接失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert(`连接失败: ${error instanceof Error ? error.message : '无法连接到服务端'}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 服务端配置 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              服务端配置
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  基础服务地址
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://serverIP:PORT"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  例如: https://192.168.1.100:8080 或 https://api.example.com
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="serverEnabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary-500"
                />
                <label htmlFor="serverEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                  启用服务端同步
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleTestConnection}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  测试连接
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  {saved ? '已保存!' : '保存'}
                </button>
              </div>
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              配置说明
            </h4>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>配置服务端地址后，文件夹、API接口和环境变量将同步到服务端</li>
              <li>如果服务端未启用，数据将仅保存在本地</li>
              <li>确保服务端地址可访问，且CORS配置正确</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
