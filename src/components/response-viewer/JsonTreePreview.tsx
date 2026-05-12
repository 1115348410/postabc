import React, { useState, useCallback } from 'react';

interface JsonTreePreviewProps {
  data: unknown;
  maxHeight?: string;
  className?: string;
}

type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

interface TreeNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  isLast?: boolean;
  collapsedDepth?: number;
}

// 获取值的类型
function getNodeType(value: unknown): NodeType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'null';
}

// 获取类型对应的颜色
function getTypeColor(type: NodeType, isDark: boolean): string {
  const colors: Record<NodeType, { light: string; dark: string }> = {
    object: { light: 'text-gray-800', dark: 'text-gray-200' },
    array: { light: 'text-gray-800', dark: 'text-gray-200' },
    string: { light: 'text-green-600', dark: 'text-green-400' },
    number: { light: 'text-blue-600', dark: 'text-blue-400' },
    boolean: { light: 'text-purple-600', dark: 'text-purple-400' },
    null: { light: 'text-gray-500', dark: 'text-gray-500' },
  };
  return isDark ? colors[type].dark : colors[type].light;
}

// Unicode 解码函数
function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// 递归解码对象/数组中的所有字符串
function decodeUnicodeInData(data: unknown): unknown {
  if (typeof data === 'string') {
    return decodeUnicode(data);
  }
  if (Array.isArray(data)) {
    return data.map(decodeUnicodeInData);
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = decodeUnicodeInData(value);
    }
    return result;
  }
  return data;
}

// 获取值的显示文本
function getValuePreview(value: unknown, type: NodeType): string {
  switch (type) {
    case 'string':
      const str = String(value);
      const decoded = decodeUnicode(str);
      return `"${decoded}"`;
    case 'null':
      return 'null';
    case 'boolean':
    case 'number':
      return String(value);
    case 'array':
      return `Array(${(value as unknown[]).length})`;
    case 'object':
      return `Object {${Object.keys(value as object).length}}`;
    default:
      return String(value);
  }
}

// 展开/折叠图标
function ExpandIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// 单个树节点
function TreeNode({ keyName, value, depth, isLast = true, collapsedDepth = 2 }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < collapsedDepth);
  const type = getNodeType(value);
  const isComplex = type === 'object' || type === 'array';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const typeColor = getTypeColor(type, isDark);
  const indent = depth * 16;

  const toggleExpand = useCallback(() => {
    if (isComplex) {
      setIsExpanded(!isExpanded);
    }
  }, [isComplex, isExpanded]);

  // 获取子元素
  const getChildren = () => {
    if (type === 'array') {
      return (value as unknown[]).map((item, index) => (
        <TreeNode
          key={index}
          keyName={String(index)}
          value={item}
          depth={depth + 1}
          isLast={index === (value as unknown[]).length - 1}
          collapsedDepth={collapsedDepth}
        />
      ));
    }
    if (type === 'object') {
      const entries = Object.entries(value as object);
      return entries.map(([key, val], index) => (
        <TreeNode
          key={key}
          keyName={key}
          value={val}
          depth={depth + 1}
          isLast={index === entries.length - 1}
          collapsedDepth={collapsedDepth}
        />
      ));
    }
    return null;
  };

  const children = getChildren();
  const hasChildren = children && children.length > 0;

  // 简单值（字符串、数字、布尔、null）
  if (!isComplex) {
    return (
      <div
        className="flex items-start hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1"
        style={{ paddingLeft: `${indent}px` }}
      >
        {keyName !== undefined && (
          <>
            <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
              "{keyName}":
            </span>
            <span className="text-gray-400 mx-1"> </span>
          </>
        )}
        <span className={`font-mono text-sm break-all ${typeColor}`}>
          {getValuePreview(value, type)}
        </span>
        {!isLast && <span className="text-gray-400">,</span>}
      </div>
    );
  }

  // 复杂值（对象、数组）
  const openBracket = type === 'array' ? '[' : '{';
  const closeBracket = type === 'array' ? ']' : '}';

  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      {/* 头部行：键名 + 展开图标 + 摘要 */}
      <div
        className="flex items-start hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1 cursor-pointer"
        onClick={toggleExpand}
      >
        {hasChildren && (
          <span className="inline-flex items-center justify-center w-4 h-4 mt-0.5 mr-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <ExpandIcon isExpanded={isExpanded} />
          </span>
        )}
        {!hasChildren && <span className="w-5" />}
        {keyName !== undefined && (
          <span className="text-gray-600 dark:text-gray-400 font-mono text-sm mr-1">
            "{keyName}":
          </span>
        )}
        {!isExpanded ? (
          <span className="text-gray-500 font-mono text-sm">
            {openBracket}
            <span className="text-gray-400 italic">
              {type === 'array'
                ? `${(value as unknown[]).length} items`
                : `${Object.keys(value as object).length} keys`}
            </span>
            {closeBracket}
            {!isLast && ','}
          </span>
        ) : (
          <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">{openBracket}</span>
        )}
      </div>

      {/* 子元素 */}
      {isExpanded && hasChildren && (
        <div className="border-l border-gray-200 dark:border-gray-700 ml-2">
          {children}
        </div>
      )}

      {/* 闭合括号 */}
      {isExpanded && (
        <div
          className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1"
          style={{ paddingLeft: `${indent}px` }}
        >
          <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">{closeBracket}</span>
          {!isLast && <span className="text-gray-400">,</span>}
        </div>
      )}
    </div>
  );
}

// 工具栏
function Toolbar({
  onExpandAll,
  onCollapseAll,
  onCopy,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <button
        onClick={onExpandAll}
        className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      >
        全部展开
      </button>
      <button
        onClick={onCollapseAll}
        className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      >
        全部折叠
      </button>
      <div className="flex-1" />
      <button
        onClick={handleCopy}
        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-1"
      >
        {copied ? (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            已复制
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </>
        )}
      </button>
    </div>
  );
}

export default function JsonTreePreview({ data, maxHeight = '100%', className = '' }: JsonTreePreviewProps) {
  const [expandKey, setExpandKey] = useState(0);

  // 尝试解析数据并解码 Unicode
  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
      // 递归解码所有 Unicode 转义字符
      parsedData = decodeUnicodeInData(parsedData);
    } catch {
      // 如果解析失败，尝试解码字符串中的 Unicode
      parsedData = decodeUnicode(data);
    }
  } else if (data !== null && typeof data === 'object') {
    // 对对象/数组也进行 Unicode 解码
    parsedData = decodeUnicodeInData(data);
  }

  const handleExpandAll = () => {
    setExpandKey(prev => prev + 1);
  };

  const handleCollapseAll = () => {
    setExpandKey(prev => prev - 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
  };

  // 如果数据不是对象或数组，直接显示
  const type = getNodeType(parsedData);
  if (type !== 'object' && type !== 'array') {
    return (
      <div className={`flex flex-col h-full bg-white dark:bg-gray-950 ${className}`}>
        <Toolbar onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} onCopy={handleCopy} />
        <div className="flex-1 overflow-auto p-4">
          <span className={`font-mono text-sm ${getTypeColor(type, false)}`}>
            {getValuePreview(parsedData, type)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-950 ${className}`}>
      <Toolbar onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} onCopy={handleCopy} />
      <div className="flex-1 overflow-auto p-4" style={{ maxHeight }}>
        <TreeNode
          key={`root-${expandKey}`}
          value={parsedData}
          depth={0}
          isLast={true}
          collapsedDepth={expandKey > 0 ? Infinity : 2}
        />
      </div>
    </div>
  );
}
