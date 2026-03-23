import React, { useState } from 'react';
import type { RequestHeader } from '../../types';

interface HeadersEditorProps {
  headers: RequestHeader[];
  onChange: (headers: RequestHeader[]) => void;
  onShowBuiltinVars?: () => void;
}

export default function HeadersEditor({ headers, onChange, onShowBuiltinVars }: HeadersEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddHeader = () => {
    if (!newKey.trim()) {
      return;
    }

    const newHeader: RequestHeader = {
      key: newKey.trim(),
      value: newValue.trim(),
      enabled: true,
    };

    onChange([...headers, newHeader]);
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const handleToggleHeader = (index: number) => {
    onChange(
      headers.map((h, i) => (i === index ? { ...h, enabled: !h.enabled } : h)),
    );
  };

  const handleUpdateKey = (index: number, key: string) => {
    onChange(
      headers.map((h, i) => (i === index ? { ...h, key } : h)),
    );
  };

  const handleUpdateValue = (index: number, value: string) => {
    onChange(
      headers.map((h, i) => (i === index ? { ...h, value } : h)),
    );
  };

  // Suggested common headers
  const commonHeaders = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Accept', value: 'application/json, text/plain, */*' },
    { key: 'Authorization', value: 'Bearer {{token}}' },
    { key: 'Accept-Encoding', value: 'gzip, deflate, br' },
    { key: 'Accept-Language', value: 'zh-CN,zh;q=0.9,en;q=0.8' },
    { key: 'Cache-Control', value: 'no-cache' },
    { key: 'User-Agent', value: 'PostABC/1.0' },
  ];

  const handleAddSuggested = (header: { key: string; value: string }) => {
    const existingIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === header.key.toLowerCase(),
    );

    if (existingIndex >= 0) {
      // Update existing header
      handleUpdateKey(existingIndex, header.key);
      handleUpdateValue(existingIndex, header.value);
    } else {
      // Add new header
      onChange([
        ...headers,
        { key: header.key, value: header.value, enabled: true },
      ]);
    }
  };

  const handleAddAllDefaults = () => {
    const newHeaders = [...headers];
    commonHeaders.forEach((header) => {
      const exists = newHeaders.some(
        (h) => h.key.toLowerCase() === header.key.toLowerCase()
      );
      if (!exists) {
        newHeaders.push({ key: header.key, value: header.value, enabled: true });
      }
    });
    onChange(newHeaders);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Headers</span>
          <span className="text-gray-400 dark:text-gray-600 text-xs">
            {headers.filter((h) => h.enabled).length} / {headers.length}
          </span>
        </div>
        <button
          onClick={handleAddAllDefaults}
          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          + 添加常用头
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Quick add suggested headers - 始终显示 */}
        <div className="mb-4">
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-2">快速添加:</p>
          <div className="flex flex-wrap gap-2">
            {commonHeaders.map((header) => {
              const exists = headers.some(
                (h) => h.key.toLowerCase() === header.key.toLowerCase()
              );
              return (
                <button
                  key={header.key}
                  onClick={() => handleAddSuggested(header)}
                  disabled={exists}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    exists
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {header.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header list */}
        {headers.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">暂无请求头</p>
            <p className="text-xs mt-1">点击上方按钮添加常用请求头</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="w-10 px-2 py-2 text-left font-medium"></th>
                <th className="px-2 py-2 text-left font-medium">Key</th>
                <th className="px-2 py-2 text-left font-medium">Value</th>
                <th className="w-10 px-2 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    header.enabled ? '' : 'opacity-50'
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => handleToggleHeader(index)}
                      className={`w-5 h-5 flex items-center justify-center rounded border ${
                        header.enabled
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      aria-label={header.enabled ? 'Disable' : 'Enable'}
                    >
                      {header.enabled && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => handleUpdateKey(index, e.target.value)}
                      placeholder="Key"
                      className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => handleUpdateValue(index, e.target.value)}
                      placeholder="Value"
                      className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => handleRemoveHeader(index)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                      aria-label="Remove header"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add new header */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-2">自定义请求头:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddHeader();
                }
              }}
              placeholder="Key"
              className="flex-1 min-w-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddHeader();
                }
              }}
              placeholder="Value"
              className="flex-1 min-w-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleAddHeader}
              disabled={!newKey.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors flex-shrink-0"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
