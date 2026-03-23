import { useState, useMemo } from 'react';
import { getAllCategories, createVariableContext } from '../utils/variables';
import type { BuiltinVariable, VariableCategory } from '../utils/variables';

interface BuiltinVariablesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuiltinVariablesDrawer({
  isOpen,
  onClose,
}: BuiltinVariablesDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['datetime', 'random', 'mock'])
  );
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // 获取所有分类
  const categories = useMemo(() => {
    return getAllCategories(createVariableContext());
  }, []);

  // 过滤变量
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return categories;
    }

    return categories.map((category) => ({
      ...category,
      variables: category.variables.filter(
        (v) =>
          v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    })).filter((c) => c.variables.length > 0);
  }, [categories, searchTerm]);

  // 切换分类展开状态
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // 复制变量名
  const handleCopy = async (varName: string) => {
    try {
      await navigator.clipboard.writeText(`{{${varName}}}`);
      setCopiedVariable(varName);
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-screen bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col"
      style={{ width: '25%' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">内置变量参考</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded"
          title="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索变量..."
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Variable List */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-950">
        {filteredCategories.map((category) => (
          <div key={category.id} className="border-b border-gray-200 dark:border-gray-800">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{category.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">({category.variables.length})</span>
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                  expandedCategories.has(category.id) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Variables */}
            {expandedCategories.has(category.id) && (
              <div className="bg-gray-50 dark:bg-gray-900">
                {category.variables.map((variable) => (
                  <VariableItem
                    key={variable.name}
                    variable={variable}
                    onCopy={handleCopy}
                    isCopied={copiedVariable === variable.name}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            没有找到匹配的变量
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          点击「复制」按钮复制变量引用，使用时需用 {'{{ }}'} 包裹
        </p>
      </div>
    </div>
  );
}

// 变量项组件
function VariableItem({
  variable,
  onCopy,
  isCopied,
}: {
  variable: BuiltinVariable;
  onCopy: (name: string) => void;
  isCopied: boolean;
}) {
  const context = createVariableContext();

  return (
    <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <code className="text-sm text-primary-600 dark:text-primary-400 font-mono">{variable.name}</code>
          {variable.hasParams && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {variable.paramsFormat}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{variable.description}</p>
      </div>
      <button
        onClick={() => onCopy(variable.name)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          isCopied
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 group-hover:opacity-100 opacity-0'
        }`}
      >
        {isCopied ? '已复制' : '复制'}
      </button>
    </div>
  );
}
