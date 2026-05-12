import React, { useState, useMemo } from 'react';
import JsonTreePreview from './JsonTreePreview';

type ViewMode = 'raw' | 'tree' | 'pretty';

interface ResponseBodyViewerProps {
  content: unknown;
  contentType?: string;
  className?: string;
}

// 尝试解析 JSON
function tryParseJson(value: unknown): { success: boolean; data: unknown } {
  if (typeof value !== 'string') {
    return { success: false, data: value };
  }
  try {
    const parsed = JSON.parse(value);
    return { success: true, data: parsed };
  } catch {
    return { success: false, data: value };
  }
}

// 判断是否为 JSON 内容
function isJsonContent(value: unknown): boolean {
  if (typeof value === 'object' && value !== null) return true;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// XML 格式化
function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';

  xml = xml.replace(/>\s*</g, '><');

  for (let i = 0; i < xml.length; i++) {
    const char = xml[i];
    const nextChar = xml[i + 1];

    if (char === '<' && nextChar !== '/' && nextChar !== '!' && nextChar !== '?') {
      // 开始标签
      formatted += '\n' + tab.repeat(indent);
      indent++;
    } else if (char === '<' && nextChar === '/') {
      // 结束标签
      indent--;
      formatted += '\n' + tab.repeat(indent);
    }

    formatted += char;

    if (char === '>' && nextChar === '<' && xml[i + 2] === '/') {
      // 自闭合
      indent--;
    }
  }

  return formatted.trim();
}

// 判断是否为 XML
function isXmlContent(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>'));
}

export default function ResponseBodyViewer({ content, contentType, className = '' }: ResponseBodyViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  // 处理空内容的情况
  const safeContent = useMemo(() => {
    if (content === null || content === undefined) {
      return '';
    }
    if (typeof content === 'number') {
      return String(content);
    }
    return content;
  }, [content]);

  // 检测内容类型
  const contentAnalysis = useMemo(() => {
    const isJson = isJsonContent(safeContent);
    const isXml = isXmlContent(safeContent);
    const jsonParse = tryParseJson(safeContent);

    return {
      isJson,
      isXml,
      canFormat: isJson || isXml,
      parsedData: jsonParse.success ? jsonParse.data : safeContent,
    };
  }, [safeContent]);

  // 格式化内容
  const formattedContent = useMemo(() => {
    if (safeContent === '' || safeContent === null || safeContent === undefined) {
      return '';
    }

    if (viewMode === 'raw') {
      return typeof safeContent === 'string' ? safeContent : JSON.stringify(safeContent, null, 2);
    }

    if (viewMode === 'pretty') {
      if (contentAnalysis.isJson) {
        return JSON.stringify(contentAnalysis.parsedData, null, 2);
      }
      if (contentAnalysis.isXml && typeof safeContent === 'string') {
        return formatXml(safeContent);
      }
    }

    return typeof safeContent === 'string' ? safeContent : JSON.stringify(safeContent, null, 2);
  }, [safeContent, viewMode, contentAnalysis]);

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedContent);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-1">
          {/* 视图模式切换 */}
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'tree'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode('pretty')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'pretty'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Pretty
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'raw'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Raw
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 内容类型提示 */}
          {contentAnalysis.isJson && (
            <span className="text-xs text-gray-500 dark:text-gray-500">JSON</span>
          )}
          {contentAnalysis.isXml && (
            <span className="text-xs text-gray-500 dark:text-gray-500">XML</span>
          )}

          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {formattedContent === '' ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg
              className="w-12 h-12 mb-3 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">暂无内容</p>
          </div>
        ) : viewMode === 'tree' && contentAnalysis.isJson ? (
          <JsonTreePreview data={contentAnalysis.parsedData} maxHeight="100%" />
        ) : (
          <div className="h-full overflow-auto p-4">
            <pre className="text-gray-700 dark:text-gray-300 text-sm font-mono whitespace-pre-wrap">
              {formattedContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
