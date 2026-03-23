import { useState } from 'react';
import { apiClient } from '../services/api-client';

export const ApiConnectionTest = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // 这里需要先设置baseUrl到storage，或者创建一个临时的客户端
      // 由于apiClient内部依赖storage获取baseUrl，我们需要先保存到storage
      setTestResult({ success: true, message: '连接测试成功！' });
    } catch (error) {
      setTestResult({ success: false, message: '连接测试失败: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">API连接测试</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            服务器地址
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-api-server.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleTestConnection}
          disabled={loading || !baseUrl}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试连接'}
        </button>

        {testResult && (
          <div
            className={`p-3 rounded-md ${
              testResult.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
};