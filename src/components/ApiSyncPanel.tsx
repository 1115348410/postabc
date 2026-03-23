import { useState } from 'react';
import { apiClient } from '../services/api-client';
import { useDevToolsStore } from '../stores';
import { storageAPI } from '../storage/indexed-db';
import { apiSyncService } from '../services/api-sync-service';

export const ApiSyncPanel = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  const setServerBaseUrl = useDevToolsStore(state => state.setServerBaseUrl);
  const serverBaseUrl = useDevToolsStore(state => state.serverBaseUrl);

  // 初始化时加载已保存的baseUrl
  useState(() => {
    if (serverBaseUrl) {
      setBaseUrl(serverBaseUrl);
    }
  });

  const handleSaveBaseUrl = async () => {
    try {
      await storageAPI.saveActiveServerBaseUrl(baseUrl);
      setServerBaseUrl(baseUrl);
      setSyncMessage('服务器地址已保存');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (error) {
      setSyncMessage('保存失败: ' + (error as Error).message);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      // 临时设置baseUrl进行测试
      await storageAPI.saveActiveServerBaseUrl(baseUrl);

      // 尝试调用API获取列表来测试连接
      await apiClient.listDirectory();

      setTestResult({ success: true, message: '连接测试成功！' });
    } catch (error) {
      setTestResult({ success: false, message: '连接测试失败: ' + (error as Error).message });
    }
  };

  const handleSyncFromRemote = async () => {
    setIsSyncing(true);
    setSyncMessage('正在从远程同步数据...');
    try {
      await apiSyncService.syncFromRemote();
      setSyncMessage('同步完成！');
    } catch (error) {
      setSyncMessage('同步失败: ' + (error as Error).message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleSyncToRemote = async () => {
    setIsSyncing(true);
    setSyncMessage('正在同步数据到远程...');
    try {
      await apiSyncService.syncToRemote();
      setSyncMessage('同步完成！');
    } catch (error) {
      setSyncMessage('同步失败: ' + (error as Error).message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">API同步设置</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            服务器地址
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如: https://your-api-server.com"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSaveBaseUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleTestConnection}
            disabled={!baseUrl}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            测试连接
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-md ${
              testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">数据同步</h3>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSyncFromRemote}
              disabled={isSyncing || !baseUrl}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              从远程同步
            </button>

            <button
              onClick={handleSyncToRemote}
              disabled={isSyncing || !baseUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              同步到远程
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className={`p-3 rounded-md ${
            syncMessage.includes('失败') || syncMessage.includes('错误')
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {syncMessage}
          </div>
        )}
      </div>
    </div>
  );
};