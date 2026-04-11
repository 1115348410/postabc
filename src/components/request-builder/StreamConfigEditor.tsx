import React from 'react';
import type { StreamExtractionRule, StreamConfig } from '../../types';

interface Props {
  config: StreamConfig;
  onChange: (config: StreamConfig) => void;
}

const DEFAULT_RULE: StreamExtractionRule = {
  path: '',
  alias: '',
  concatenate: true,
};

export default function StreamConfigEditor({ config, onChange }: Props) {
  const handleToggleStreaming = () => {
    onChange({
      ...config,
      enabled: !config.enabled,
    });
  };

  const handleAddRule = () => {
    onChange({
      ...config,
      extractionRules: [...config.extractionRules, { ...DEFAULT_RULE }],
    });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = config.extractionRules.filter((_, i) => i !== index);
    onChange({
      ...config,
      extractionRules: newRules,
    });
  };

  const handleRuleChange = (
    index: number,
    field: keyof StreamExtractionRule,
    value: string | boolean
  ) => {
    const newRules = [...config.extractionRules];
    newRules[index] = {
      ...newRules[index],
      [field]: value,
    };
    onChange({
      ...config,
      extractionRules: newRules,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={handleToggleStreaming}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                启用流式输出解析
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Extraction Rules */}
      {config.enabled && (
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              字段提取规则
            </span>
            <button
              onClick={handleAddRule}
              className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-2 py-1 rounded transition-colors"
            >
              + 添加规则
            </button>
          </div>

          {config.extractionRules.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">暂无提取规则</p>
              <p className="text-xs mt-1">点击"添加规则"自定义字段提取路径</p>
            </div>
          ) : (
            <div className="space-y-3">
              {config.extractionRules.map((rule, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            字段路径
                          </label>
                          <input
                            type="text"
                            value={rule.path}
                            onChange={(e) => handleRuleChange(index, 'path', e.target.value)}
                            placeholder="例如: $.choices[0].delta.content"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            显示名称
                          </label>
                          <input
                            type="text"
                            value={rule.alias || ''}
                            onChange={(e) => handleRuleChange(index, 'alias', e.target.value)}
                            placeholder="别名"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        内容将自动拼接
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveRule(index)}
                      className="text-red-500 hover:text-red-600 p-1"
                      title="删除规则"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help text */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
              路径表达式说明
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <li>• 使用 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">$</code> 表示根对象</li>
              <li>• 使用点号访问对象属性: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">$.data.content</code></li>
              <li>• 使用方括号访问数组: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">$.choices[0].text</code></li>
            </ul>
          </div>
        </div>
      )}

      {/* Disabled state */}
      {!config.enabled && (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-sm">启用流式输出解析以配置字段提取</p>
          </div>
        </div>
      )}
    </div>
  );
}
