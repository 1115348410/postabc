import React, { useState, useEffect } from 'react';
import { storageAPI, type RequestHistoryItem } from '../storage/indexed-db';
import type { RequestConfig } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRequest?: (request: RequestConfig) => void;
}

export default function HistoryPanel({ isOpen, onClose, onSelectRequest }: HistoryPanelProps) {
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    const items = await storageAPI.getRequestHistory();
    setHistory(items);
  };

  const handleDeleteItem = async (id: number) => {
    await storageAPI.deleteRequestHistory(id);
    await loadHistory();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all history?')) {
      await storageAPI.clearRequestHistory();
      await loadHistory();
    }
  };

  const handleSelectItem = (item: RequestHistoryItem) => {
    onSelectRequest?.(item.request);
    onClose();
  };

  const filteredHistory = history.filter(
    (item) =>
      item.request.url.toLowerCase().includes(filter.toLowerCase()) ||
      item.request.method.toLowerCase().includes(filter.toLowerCase()),
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (diff > 1000 * 60) {
      return `${Math.floor(diff / (1000 * 60))} min ago`;
    }
    return 'Just now';
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-success-400',
      POST: 'text-primary-400',
      PUT: 'text-warning-400',
      PATCH: 'text-warning-400',
      DELETE: 'text-danger-400',
      HEAD: 'text-purple-400',
      OPTIONS: 'text-purple-400',
      TRACE: 'text-gray-400',
    };
    return colors[method] || 'text-gray-400';
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
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
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* History List */}
        <div className="flex-1 overflow-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {filter ? 'No matching requests found' : 'No history yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleSelectItem(item)}
                >
                  <span className={`text-xs font-mono font-medium ${getMethodColor(item.request.method)} min-w-[60px]`}>
                    {item.request.method}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.request.url}
                    </p>
                    {item.response && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.response.status} {item.response.statusText} · {(item.response.time || 0).toFixed(0)}ms
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {formatDate(item.timestamp)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id!);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Delete"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm font-medium transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
