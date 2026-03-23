import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDevToolsStore } from '../../stores';
import type { ResponseData, StreamConfig, StreamExtractionRule, SSEEvent } from '../../types';

type Tab = 'body' | 'headers' | 'console';

interface ResponsePanelProps {
  streamConfig?: StreamConfig;
  onStreamConfigChange?: (config: StreamConfig) => void;
}

/**
 * 从 SSE 事件数据中提取指定路径的值
 */
function extractValue(data: any, path: string): any {
  if (!data || !path) return undefined;

  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current = data;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (/^\d+$/.test(part)) {
      current = current[parseInt(part, 10)];
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * 解析 SSE 事件的 data 字段
 */
function parseEventData(event: SSEEvent): any {
  if (!event.data) return null;
  try {
    return JSON.parse(event.data);
  } catch {
    return event.data;
  }
}

/**
 * 流式内容提取器组件
 */
function StreamBodyContent({
  events,
  streamConfig
}: {
  events: SSEEvent[];
  streamConfig: StreamConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  // 存储每个规则的展开/折叠状态
  const [collapsedRules, setCollapsedRules] = useState<Record<number, boolean>>({});

  // 提取并拼接内容
  const extractedContent = React.useMemo(() => {
    if (!streamConfig.enabled || streamConfig.extractionRules.length === 0) {
      return null;
    }

    const results: { alias: string; values: any[]; concatenatedValue: string | undefined }[] = [];

    for (const rule of streamConfig.extractionRules) {
      const values: any[] = [];

      for (const event of events) {
        const parsed = parseEventData(event);
        if (parsed && typeof parsed === 'object') {
          const value = extractValue(parsed, rule.path);
          // 过滤掉 undefined、null、空字符串和纯空白字符串
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            values.push(value);
          }
        }
      }

      // 最终过滤：确保所有值都是非空字符串
      const validValues = values.map(v => String(v).trim()).filter(v => v !== '');
      
      results.push({
        alias: rule.alias || rule.path,
        values: validValues,
        concatenatedValue: validValues.join('')
      });
    }

    return results;
  }, [events, streamConfig]);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [extractedContent, autoScroll]);

  // 切换指定规则的展开/折叠状态
  const toggleRule = (index: number) => {
    setCollapsedRules(prev => {
      const currentState = prev[index];
      // 如果是 index 0，默认是展开的（false），所以 toggle 后应该变成 true（折叠）
      // 如果是其他 index，默认是折叠的（true），所以 toggle 后应该变成 false（展开）
      const newState = currentState === undefined 
        ? (index === 0 ? true : false) 
        : !currentState;
      return {
        ...prev,
        [index]: newState
      };
    });
  };

  // 检查规则是否折叠
  const isRuleCollapsed = (index: number) => {
    // index 0 默认展开（false），其他默认折叠（true）
    if (index === 0) return false;
    return collapsedRules[index] !== undefined ? collapsedRules[index] : true;
  };

  if (!extractedContent || extractedContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
        <p className="text-sm">暂无提取内容</p>
        <p className="text-xs mt-1">请检查流式提取规则配置</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          已接收 {events.length} 个事件
        </span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3 accent-primary-500"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">自动滚动</span>
        </label>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto p-3 space-y-2">
        {extractedContent.map((field, index) => {
          const isCollapsed = isRuleCollapsed(index);
          return (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* 规则标题栏 - 可点击折叠/展开 */}
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleRule(index)}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {field.alias}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {field.values.length} 个值 {isCollapsed ? '(已折叠)' : ''}
                </span>
              </div>
              {/* 规则内容 - 折叠时隐藏 */}
              {!isCollapsed && field.concatenatedValue && (
                <div className="px-3 pb-3">
                  <div className="bg-white dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-60 overflow-auto">
                      {field.concatenatedValue}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 原始 SSE 事件列表显示
 */
function SSEEventList({ events }: { events: SSEEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {events.length} 个事件
        </span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3 accent-primary-500"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">自动滚动</span>
        </label>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <p className="text-sm">暂无事件</p>
          </div>
        ) : (
          events.map((event, index) => {
            const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
            return (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-primary-500 dark:text-primary-400 font-bold">
                  <span>[{timestamp}]</span>
                  <span>Event {index + 1}: {event.event || 'message'}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                  Data: {event.data || ''}
                </div>
                {event.id && (
                  <div className="text-gray-500 dark:text-gray-500">ID: {event.id}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Console 组件
function InlineConsole() {
  const { getActiveTab } = useDevToolsStore();
  const activeTab = getActiveTab();
  const currentResponse = activeTab?.response;
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  // 跟踪已处理的事件数量，用于增量更新
  const processedEventsCountRef = useRef(0);
  // 跟踪当前请求的时间戳，用于检测新请求
  const currentRequestTimestampRef = useRef<number | null>(null);
  // 存储 curl 命令
  const curlCommandRef = useRef<string | null>(null);

  // 生成 curl 命令
  const generateCurlCommand = useCallback(() => {
    if (!currentResponse?.request) return null;

    const { method, url, headers, body } = currentResponse.request;
    let curl = `curl -X ${method} '${url}'`;

    // 添加请求头
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${String(value).replace(/'/g, "'\\''")}'`;
      });
    }

    // 添加请求体
    if (body) {
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }

    return curl;
  }, [currentResponse]);

  // 实时追加 SSE 事件日志
  useEffect(() => {
    if (!currentResponse) {
      // 响应清空时，重置所有状态
      setLogs([]);
      processedEventsCountRef.current = 0;
      currentRequestTimestampRef.current = null;
      curlCommandRef.current = null;
      return;
    }

    // 检测是否是新请求（通过时间戳判断）
    const isNewRequest = currentRequestTimestampRef.current !== currentResponse.timestamp;

    if (isNewRequest) {
      // 新请求开始，重置日志
      processedEventsCountRef.current = 0;
      currentRequestTimestampRef.current = currentResponse.timestamp;
      curlCommandRef.current = generateCurlCommand();

      // 初始化日志（添加 curl 命令）
      const initialLogs: string[] = [];
      if (curlCommandRef.current) {
        initialLogs.push('=== 请求原始报文 (curl) ===');
        initialLogs.push(curlCommandRef.current);
        initialLogs.push('');
      }
      setLogs(initialLogs);
    }

    // 处理 SSE 流式响应
    if (currentResponse?.body?.type === 'sse') {
      const sseEvents = currentResponse.body.content as any[];
      const totalEvents = sseEvents.length;
      const processedCount = processedEventsCountRef.current;

      // 只处理新增的事件
      if (totalEvents > processedCount) {
        const newLogs: string[] = [];

        for (let i = processedCount; i < totalEvents; i++) {
          const event = sseEvents[i];
          const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
          const logMessage = `[${timestamp}] Event ${i + 1}: ${event.event || 'message'}`;
          const dataContent = event.data || '';

          newLogs.push(logMessage);
          newLogs.push(`  Data: ${dataContent}`);
          if (event.id) {
            newLogs.push(`  ID: ${event.id}`);
          }
          if (event.retry) {
            newLogs.push(`  Retry: ${event.retry}ms`);
          }
        }

        // 追加新日志
        if (newLogs.length > 0) {
          setLogs(prev => [...prev, ...newLogs]);
        }

        processedEventsCountRef.current = totalEvents;
      }
    } else if (currentResponse?.body) {
      // 非 SSE 响应，显示响应摘要和原始报文
      if (isNewRequest) {
        const timestamp = new Date().toLocaleTimeString();
        const responseLogs: string[] = [
          '',
          `=== 响应原始报文 ===`,
          `[${timestamp}] 响应已接收`,
          `状态码: ${currentResponse.status} ${currentResponse.statusText}`,
          `耗时: ${currentResponse.time}ms`,
          `大小: ${(currentResponse.size / 1024).toFixed(2)} KB`,
          '',
        ];

        // 根据响应类型格式化内容
        if (currentResponse.body.type === 'json') {
          try {
            const jsonContent = typeof currentResponse.body.content === 'string'
              ? currentResponse.body.content
              : JSON.stringify(currentResponse.body.content, null, 2);
            responseLogs.push(jsonContent);
          } catch {
            responseLogs.push(String(currentResponse.body.content));
          }
        } else if (currentResponse.body.type === 'text') {
          responseLogs.push(String(currentResponse.body.content));
        } else {
          responseLogs.push(`[${currentResponse.body.type} 类型响应]`);
        }

        setLogs(prev => [...prev, ...responseLogs]);
      }
    }
  }, [currentResponse, generateCurlCommand]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 复制 curl 命令
  const copyCurl = () => {
    const curlCommand = curlCommandRef.current || generateCurlCommand();
    if (curlCommand) {
      navigator.clipboard.writeText(curlCommand);
    }
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    processedEventsCountRef.current = 0;
    curlCommandRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">控制台</span>
          <span className="text-gray-400 dark:text-gray-600 text-xs">
            {logs.length} 条日志
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentResponse?.request && (
            <button
              onClick={copyCurl}
              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 text-xs transition-colors"
            >
              复制 curl
            </button>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-primary-500 w-4 h-4"
            />
            <span className="text-gray-500 dark:text-gray-500 text-xs">自动滚动</span>
          </label>
          <button
            onClick={clearLogs}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 text-xs transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <div
        ref={consoleEndRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-white dark:bg-gray-900"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <p className="text-sm">暂无控制台输出</p>
          </div>
        ) : (
          <div className="space-y-2 w-full max-w-full">
            {logs.map((log, index) => {
              const isEventStart = log.startsWith('[');
              const isDataLine = log.startsWith('  Data:');
              const isIdLine = log.startsWith('  ID:');
              const isRetryLine = log.startsWith('  Retry:');
              const isCurlHeader = log.startsWith('===');
              const isCurlCommand = log.startsWith('curl');

              return (
                <div
                  key={index}
                  className={`font-mono text-xs whitespace-pre-wrap break-words w-full ${
                    isCurlHeader
                      ? 'text-yellow-600 dark:text-yellow-400 font-bold mt-2'
                      : isCurlCommand
                      ? 'text-green-600 dark:text-green-400'
                      : isEventStart
                      ? 'text-primary-500 dark:text-primary-400 font-bold'
                      : isDataLine
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {log}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResponsePanel({ streamConfig, onStreamConfigChange }: ResponsePanelProps) {
  const { getActiveTab } = useDevToolsStore();
  const activeTab = getActiveTab();
  const currentResponse = activeTab?.response;
  const [activeTabState, setActiveTabState] = useState<Tab>('body');

  // Default stream config if not provided
  const currentStreamConfig: StreamConfig = streamConfig || {
    enabled: false,
    extractionRules: [],
    displayMode: 'concatenated',
  };

  // 判断是否为 SSE 流式响应
  const isSSEResponse = currentResponse?.body?.type === 'sse';
  const sseEvents: SSEEvent[] = isSSEResponse && Array.isArray(currentResponse.body.content)
    ? currentResponse.body.content
    : [];

  // 判断是否启用了流式提取
  const hasStreamExtraction = currentStreamConfig.enabled && currentStreamConfig.extractionRules.length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 状态栏 - 仅在有响应时显示 */}
      {currentResponse && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span
            className={`text-sm font-medium ${
              currentResponse.status >= 200 && currentResponse.status < 300
                ? 'text-green-600 dark:text-success-400'
                : currentResponse.status >= 400 && currentResponse.status < 500
                ? 'text-yellow-600 dark:text-warning-400'
                : 'text-red-600 dark:text-danger-400'
            }`}
          >
            {currentResponse.status} {currentResponse.statusText}
          </span>
          <span className="text-gray-500 dark:text-gray-500 text-xs">
            {currentResponse.time}ms
          </span>
          <span className="text-gray-500 dark:text-gray-500 text-xs">
            {(currentResponse.size / 1024).toFixed(2)} KB
          </span>
          {isSSEResponse && (
            <span className="text-primary-500 dark:text-primary-400 text-xs">
              {sseEvents.length} 个事件
            </span>
          )}
        </div>
      )}

      {/* 标签页 - 固定显示 Body、Headers、Console */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={() => setActiveTabState('body')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === 'body'
              ? 'text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400'
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTabState('headers')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === 'headers'
              ? 'text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400'
          }`}
        >
          Headers {currentResponse ? `(${Object.keys(currentResponse.headers).length})` : ''}
        </button>
        <button
          onClick={() => setActiveTabState('console')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === 'console'
              ? 'text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400'
          }`}
        >
          Console
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950">
        {activeTabState === 'body' && (
          <div className="h-full overflow-auto">
            {currentResponse ? (
              <>
                {/* JSON 响应 */}
                {currentResponse.body.type === 'json' && (
                  <div className="p-4">
                    <pre className="text-gray-700 dark:text-gray-300 text-sm font-mono whitespace-pre-wrap">
                      {typeof currentResponse.body.content === 'string'
                        ? currentResponse.body.content
                        : JSON.stringify(currentResponse.body.content, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 文本响应 */}
                {currentResponse.body.type === 'text' && (
                  <div className="p-4">
                    <pre className="text-gray-700 dark:text-gray-300 text-sm font-mono whitespace-pre-wrap">
                      {String(currentResponse.body.content)}
                    </pre>
                  </div>
                )}

                {/* SSE 流式响应 */}
                {currentResponse.body.type === 'sse' && (
                  hasStreamExtraction ? (
                    // 启用流式提取：显示提取后的拼接内容
                    <StreamBodyContent events={sseEvents} streamConfig={currentStreamConfig} />
                  ) : (
                    // 未启用流式提取：显示原始事件列表（类似 Console）
                    <SSEEventList events={sseEvents} />
                  )
                )}
              </>
            ) : (
              /* 无响应时显示空白占位 */
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">暂无响应</p>
                <p className="text-sm mt-1">发送请求后在此查看结果</p>
              </div>
            )}
          </div>
        )}

        {activeTabState === 'headers' && (
          <div className="h-full overflow-auto p-4">
            {currentResponse ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-500">
                    <th className="pb-2 border-b border-gray-200 dark:border-gray-800">Key</th>
                    <th className="pb-2 border-b border-gray-200 dark:border-gray-800">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentResponse.headers).map(([key, value]) => (
                    <tr key={key} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2 border-b border-gray-200 dark:border-gray-800 font-mono">
                        {key}
                      </td>
                      <td className="py-2 border-b border-gray-200 dark:border-gray-800 font-mono">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-lg">暂无 Headers</p>
                <p className="text-sm mt-1">发送请求后在此查看响应头</p>
              </div>
            )}
          </div>
        )}

        {activeTabState === 'console' && (
          <div className="h-full overflow-hidden">
            <InlineConsole />
          </div>
        )}
      </div>
    </div>
  );
}
