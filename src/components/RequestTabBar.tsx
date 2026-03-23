import React, { useState, useRef, useEffect } from 'react';
import type { RequestTab } from '../types';

interface RequestTabBarProps {
  tabs: RequestTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, newName: string) => void;
  onAddTab: () => void;
}

export default function RequestTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabRename,
  onAddTab,
}: RequestTabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (tab: RequestTab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && editingName.trim()) {
      onTabRename(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
      {/* Tab list */}
      <div className="flex flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`
              group flex items-center gap-2 px-3 py-2 cursor-pointer
              border-r border-gray-200 dark:border-gray-800
              min-w-[120px] max-w-[200px]
              transition-colors
              ${activeTabId === tab.id
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }
            `}
          >
            {/* Tab name (editable) */}
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white dark:bg-gray-700 border border-primary-500 rounded px-1 py-0.5 text-sm focus:outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => handleDoubleClick(tab)}
                className="flex-1 truncate text-sm select-none"
                title={tab.name}
              >
                {tab.name}
                {tab.isModified && <span className="text-primary-500 ml-1">•</span>}
              </span>
            )}

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="
                opacity-0 group-hover:opacity-100
                p-0.5 rounded
                text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                transition-all
              "
              title="关闭"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAddTab}
        className="
          flex items-center justify-center
          w-8 h-8 m-1
          rounded
          text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white
          hover:bg-gray-200 dark:hover:bg-gray-800
          transition-colors
        "
        title="新建接口"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
