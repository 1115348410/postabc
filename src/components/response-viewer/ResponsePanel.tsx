import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDevToolsStore } from "../../stores";
import type {
  ResponseData,
  StreamConfig,
  StreamExtractionRule,
  SSEEvent,
} from "../../types";
import JsonTreePreview from "./JsonTreePreview";
import ResponseBodyViewer from "./ResponseBodyViewer";

type Tab = "body" | "headers" | "console";

interface ResponsePanelProps {
  streamConfig?: StreamConfig;
  onStreamConfigChange?: (config: StreamConfig) => void;
}

/**
 * 从 SSE 事件数据中提取指定路径的值
 * 支持 $ 作为根对象引用
 */
function extractValue(data: any, path: string): any {
  if (!data || !path) return undefined;

  // 处理 $ 前缀
  let normalizedPath = path.trim();
  if (normalizedPath.startsWith("$.")) {
    normalizedPath = normalizedPath.slice(2);
  } else if (normalizedPath.startsWith("$")) {
    normalizedPath = normalizedPath.slice(1);
  }

  const parts = normalizedPath.split(/\.|\[|\]/).filter(Boolean);
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
  streamConfig,
}: {
  events: SSEEvent[];
  streamConfig: StreamConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  // 存储每个规则的展开/折叠状态
  const [collapsedRules, setCollapsedRules] = useState<Record<number, boolean>>(
    {},
  );

  // 提取并拼接内容
  const extractedContent = React.useMemo(() => {
    if (!streamConfig.enabled || streamConfig.extractionRules.length === 0) {
      return null;
    }

    const results: {
      alias: string;
      values: any[];
      concatenatedValue: string | undefined;
    }[] = [];

    for (const rule of streamConfig.extractionRules) {
      const values: any[] = [];

      for (const event of events) {
        const parsed = parseEventData(event);
        if (parsed && typeof parsed === "object") {
          const value = extractValue(parsed, rule.path);
          // 只过滤 null 和 undefined，保留其他所有值（包括空字符串、换行符、空格等）
          if (value !== undefined && value !== null) {
            values.push(value);
          }
        }
      }

      // 最终过滤：只过滤 null 和 undefined
      const validValues = values.filter((v) => v !== undefined && v !== null);

      results.push({
        alias: rule.alias || rule.path,
        values: validValues,
        concatenatedValue: validValues.join(""),
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
    setCollapsedRules((prev) => {
      const currentState = prev[index];
      // 如果是 index 0，默认是展开的（false），所以 toggle 后应该变成 true（折叠）
      // 如果是其他 index，默认是折叠的（true），所以 toggle 后应该变成 false（展开）
      const newState =
        currentState === undefined
          ? index === 0
            ? true
            : false
          : !currentState;
      return {
        ...prev,
        [index]: newState,
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
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto p-2 space-y-2">
        {extractedContent.map((result, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded"
          >
            <div
              className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750"
              onClick={() => toggleRule(index)}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isRuleCollapsed(index) ? "" : "rotate-90"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {result.alias}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {result.values.length} 个值
              </span>
            </div>
            {!isRuleCollapsed(index) && (
              <div className="p-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                  {result.concatenatedValue || "（空）"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// SSE 事件列表组件
function SSEEventList({ events }: { events: SSEEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>(
    {},
  );

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // 切换事件展开/折叠状态
  const toggleEvent = (index: number) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // 检查事件是否展开（默认展开最后 5 个事件）
  const isEventExpanded = (index: number) => {
    if (expandedEvents[index] !== undefined) {
      return expandedEvents[index];
    }
    // 默认展开最后 5 个事件
    return index >= Math.max(0, events.length - 5);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {events.length} 个事件
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3 accent-primary-500"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            自动滚动
          </span>
        </label>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <p className="text-sm">暂无事件</p>
          </div>
        ) : (
          events.map((event, index) => {
            const timestamp = new Date(
              event.timestamp || Date.now(),
            ).toLocaleTimeString();
            const isExpanded = isEventExpanded(index);

            return (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700"
              >
                <div
                  className="flex items-center gap-2 text-primary-500 dark:text-primary-400 font-bold cursor-pointer"
                  onClick={() => toggleEvent(index)}
                >
                  <svg
                    className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span>[{timestamp}]</span>
                  <span>
                    Event {index + 1}: {event.event || "message"}
                  </span>
                </div>
                {isExpanded && (
                  <div className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-all pl-5">
                    <div>Data: {event.data || ""}</div>
                    {event.id && (
                      <div className="text-gray-500 dark:text-gray-500">
                        ID: {event.id}
                      </div>
                    )}
                    {event.retry && (
                      <div className="text-gray-500 dark:text-gray-500">
                        Retry: {event.retry}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Console 组件 - 重构为请求/响应分离的可折叠面板
function InlineConsole() {
  const { getActiveTab } = useDevToolsStore();
  const activeTab = getActiveTab();
  const currentResponse = activeTab?.response;
  const [autoScroll, setAutoScroll] = useState(true);

  // 跟踪已处理的事件数量，用于增量更新
  const processedEventsCountRef = useRef(0);
  // 跟踪当前请求的时间戳，用于检测新请求
  const currentRequestTimestampRef = useRef<number | null>(null);

  // 请求报文状态
  const [requestPayload, setRequestPayload] = useState<string>("");
  const [isRequestExpanded, setIsRequestExpanded] = useState(true);

  // 响应报文状态
  const [responsePayload, setResponsePayload] = useState<string>("");
  const [isResponseExpanded, setIsResponseExpanded] = useState(true);

  // SSE 事件日志状态
  const [sseLogs, setSseLogs] = useState<string[]>([]);

  // 生成 curl 命令
  const generateCurlCommand = useCallback(() => {
    if (!currentResponse?.request) return "";

    const { method, url, headers, body, credentials } = currentResponse.request;
    if (!method || !url) return "";

    let curl = `curl -X ${method} '${url}'`;

    // 添加请求头
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${String(value).replace(/'/g, "'\\''")}'`;
      });
    }

    // 添加请求体 - body 应该是字符串类型
    if (body && typeof body === "string") {
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }

    return curl;
  }, [currentResponse]);

  // 生成请求详情描述
  const generateRequestDetails = useCallback(() => {
    if (!currentResponse?.request) return "";

    const { method, url, headers, body, credentials } = currentResponse.request;
    if (!method || !url) return "";

    let details = `【请求】\n`;
    details += `${method} ${url}\n`;

    // 请求头
    if (headers) {
      details += `\n【请求头】\n`;
      Object.entries(headers).forEach(([key, value]) => {
        details += `${key}: ${String(value)}\n`;
      });
    }

    // Credentials
    details += `\n【凭证】\n`;
    if (credentials === "omit") {
      details += `不携带浏览器 Cookie (credentials: omit)\n`;
    } else if (credentials === "include") {
      details += `自动携带浏览器 Cookie (credentials: include)\n`;
    } else {
      details += `${credentials || "same-origin"}\n`;
    }

    // 请求体
    if (body && typeof body === "string") {
      details += `\n【请求体】\n`;
      try {
        details += JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        details += body;
      }
    }

    return details;
  }, [currentResponse]);

  // 复制请求报文
  const copyRequestPayload = () => {
    const curlCommand = generateCurlCommand();
    if (curlCommand) {
      navigator.clipboard.writeText(curlCommand);
    }
  };

  // 复制响应报文
  const copyResponsePayload = () => {
    if (responsePayload) {
      navigator.clipboard.writeText(responsePayload);
    }
  };

  // 实时追加 SSE 事件日志
  useEffect(() => {
    if (!currentResponse) {
      // 响应清空时，重置所有状态
      setRequestPayload("");
      setResponsePayload("");
      setSseLogs([]);
      processedEventsCountRef.current = 0;
      currentRequestTimestampRef.current = null;
      setIsRequestExpanded(true);
      setIsResponseExpanded(true);
      return;
    }

    // 检测是否是新请求（通过时间戳判断）
    const isNewRequest =
      currentRequestTimestampRef.current !== currentResponse.timestamp;

    if (isNewRequest) {
      // 新请求开始，重置所有状态
      processedEventsCountRef.current = 0;
      currentRequestTimestampRef.current = currentResponse.timestamp;
      setSseLogs([]);
      setIsResponseExpanded(true);

      // 生成请求报文
      const requestDetails = generateRequestDetails();
      if (requestDetails) {
        setRequestPayload(requestDetails);
      } else if (
        currentResponse.request?.method &&
        currentResponse.request?.url
      ) {
        setRequestPayload(
          `${currentResponse.request.method} ${currentResponse.request.url}`,
        );
      } else {
        setRequestPayload("请求信息不可用");
      }

      // 生成响应报文（SSE和非SSE都需要）
      if (currentResponse.body) {
        const statusLine = `状态码：${currentResponse.status} ${currentResponse.statusText}`;
        const infoLine = `耗时：${currentResponse.time}ms | 大小：${(currentResponse.size / 1024).toFixed(2)} KB`;

        let content = "";
        if (currentResponse.body.type === "sse") {
          content = `[SSE 流式响应 - 已接收 ${(currentResponse.body.content as any[]).length} 个事件]`;
        } else if (currentResponse.body.type === "json") {
          try {
            content =
              typeof currentResponse.body.content === "string"
                ? currentResponse.body.content
                : JSON.stringify(currentResponse.body.content, null, 2);
          } catch {
            content = String(currentResponse.body.content);
          }
        } else if (currentResponse.body.type === "text") {
          content = String(currentResponse.body.content);
        } else {
          content = `[${currentResponse.body.type} 类型响应]`;
        }

        setResponsePayload(`${statusLine}\n${infoLine}\n\n${content}`);
      }
    }

    // 处理 SSE 流式响应 - 更新事件计数
    if (currentResponse?.body?.type === "sse") {
      const sseEvents = currentResponse.body.content as any[];
      const totalEvents = sseEvents.length;
      const processedCount = processedEventsCountRef.current;

      // 更新响应报文（更新事件计数）
      if (totalEvents > processedCount) {
        const statusLine = `状态码：${currentResponse.status} ${currentResponse.statusText}`;
        const infoLine = `耗时：${currentResponse.time}ms | 大小：${(currentResponse.size / 1024).toFixed(2)} KB`;
        const content = `[SSE 流式响应 - 已接收 ${totalEvents} 个事件]`;
        setResponsePayload(`${statusLine}\n${infoLine}\n\n${content}`);
      }

      // 只处理新增的事件，最多保留最近 200 条日志
      if (totalEvents > processedCount) {
        const newLogs: string[] = [];
        const startIndex = Math.max(processedCount, totalEvents - 100);

        for (let i = startIndex; i < totalEvents; i++) {
          const event = sseEvents[i];
          const timestamp = new Date(
            event.timestamp || Date.now(),
          ).toLocaleTimeString();
          const logMessage = `[${timestamp}] Event ${i + 1}: ${event.event || "message"}`;
          const dataContent = (event.data || "").slice(0, 500);

          newLogs.push(logMessage);
          newLogs.push(`  Data: ${dataContent}${dataContent.length > 500 ? "..." : ""}`);
          if (event.id) {
            newLogs.push(`  ID: ${event.id}`);
          }
          if (event.retry) {
            newLogs.push(`  Retry: ${event.retry}ms`);
          }
        }

        // 追加新日志，最多保留 400 条日志（每个事件最多产生 4 条日志行）
        if (newLogs.length > 0) {
          setSseLogs((prev) => {
            const combined = [...prev, ...newLogs];
            return combined.slice(-400);
          });
        }

        processedEventsCountRef.current = totalEvents;
      }
    }
  }, [currentResponse, generateCurlCommand]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [sseLogs, autoScroll]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            控制台
          </span>
          <span className="text-gray-400 dark:text-gray-600 text-xs">
            {sseLogs.length} 个事件
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-primary-500 w-4 h-4"
            />
            <span className="text-gray-500 dark:text-gray-500 text-xs">
              自动滚动
            </span>
          </label>
          <button
            onClick={() => {
              setSseLogs([]);
              setRequestPayload("");
              setResponsePayload("");
              processedEventsCountRef.current = 0;
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 text-xs transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <div ref={consoleEndRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 请求报面板 */}
        {requestPayload && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRequestExpanded(!isRequestExpanded)}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                      isRequestExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  请求报文
                </span>
              </div>
              <button
                onClick={copyRequestPayload}
                className="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                复制
              </button>
            </div>
            {isRequestExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900">
                <pre className="text-xs font-mono text-green-600 dark:text-green-400 whitespace-pre-wrap break-all">
                  {requestPayload}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 响应报文面板 */}
        {responsePayload && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                      isResponseExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  响应报文
                </span>
              </div>
              <button
                onClick={copyResponsePayload}
                className="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                复制
              </button>
            </div>
            {isResponseExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900">
                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                  {responsePayload}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SSE 事件日志 */}
        {sseLogs.length > 0 && (
          <div className="space-y-1">
            {sseLogs.map((log, index) => {
              const isEventStart = log.startsWith("[");
              const isDataLine = log.startsWith("  Data:");
              const isIdLine = log.startsWith("  ID:");
              const isRetryLine = log.startsWith("  Retry:");

              return (
                <div
                  key={index}
                  className={`font-mono text-xs whitespace-pre-wrap break-words ${
                    isEventStart
                      ? "text-primary-500 dark:text-primary-400 font-bold"
                      : isDataLine
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-500 dark:text-gray-500"
                  }`}
                >
                  {log}
                </div>
              );
            })}
          </div>
        )}

        {/* 空状态提示 */}
        {!requestPayload && !responsePayload && sseLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-600">
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
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">暂无控制台输出</p>
            <p className="text-xs mt-1">发送请求后在此查看请求和响应报文</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResponsePanel({
  streamConfig,
  onStreamConfigChange,
}: ResponsePanelProps) {
  const { getActiveTab } = useDevToolsStore();
  const activeTab = getActiveTab();
  const currentResponse = activeTab?.response;
  const [activeTabState, setActiveTabState] = useState<Tab>("body");

  // Default stream config if not provided
  const currentStreamConfig: StreamConfig = streamConfig || {
    enabled: false,
    extractionRules: [],
    displayMode: "concatenated",
  };

  // 判断是否为 SSE 流式响应
  const isSSEResponse = currentResponse?.body?.type === "sse";
  const sseEvents: SSEEvent[] =
    isSSEResponse && Array.isArray(currentResponse.body.content)
      ? currentResponse.body.content
      : [];

  // 判断是否启用了流式提取
  const hasStreamExtraction =
    currentStreamConfig.enabled &&
    currentStreamConfig.extractionRules.length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 状态栏 - 仅在有响应时显示 */}
      {currentResponse && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span
            className={`text-sm font-medium ${
              currentResponse.status >= 200 && currentResponse.status < 300
                ? "text-green-600 dark:text-success-400"
                : currentResponse.status >= 400 && currentResponse.status < 500
                  ? "text-yellow-600 dark:text-warning-400"
                  : "text-red-600 dark:text-danger-400"
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
          onClick={() => setActiveTabState("body")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === "body"
              ? "text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400"
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTabState("headers")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === "headers"
              ? "text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400"
          }`}
        >
          Headers{" "}
          {currentResponse
            ? `(${Object.keys(currentResponse.headers).length})`
            : ""}
        </button>
        <button
          onClick={() => setActiveTabState("console")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTabState === "console"
              ? "text-primary-600 dark:text-white border-b-2 border-primary-500 bg-white dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400"
          }`}
        >
          Console
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950">
        {activeTabState === "body" && (
          <div className="h-full overflow-auto">
            {currentResponse && currentResponse.body ? (
              <>
                {/* JSON/文本响应 - 使用带格式化选项的查看器 */}
                {(currentResponse.body.type === "json" ||
                  currentResponse.body.type === "text") && (
                  <ResponseBodyViewer
                    content={currentResponse.body.content}
                    contentType={currentResponse.body.type}
                    className="h-full"
                  />
                )}

                {/* SSE 流式响应 */}
                {currentResponse.body.type === "sse" &&
                  (hasStreamExtraction ? (
                    // 启用流式提取：显示提取后的拼接内容
                    <StreamBodyContent
                      events={sseEvents}
                      streamConfig={currentStreamConfig}
                    />
                  ) : (
                    // 未启用流式提取：显示原始事件列表（类似 Console）
                    <SSEEventList events={sseEvents} />
                  ))}
              </>
            ) : (
              /* 无响应时显示空白占位 */
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg
                  className="w-16 h-16 mb-4 opacity-30"
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
                <p className="text-lg">暂无响应</p>
                <p className="text-sm mt-1">发送请求后在此查看结果</p>
              </div>
            )}
          </div>
        )}

        {activeTabState === "headers" && (
          <div className="h-full overflow-auto p-4">
            {currentResponse && currentResponse.headers ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-500">
                    <th className="pb-2 border-b border-gray-200 dark:border-gray-800">
                      Key
                    </th>
                    <th className="pb-2 border-b border-gray-200 dark:border-gray-800">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentResponse.headers).map(
                    ([key, value]) => (
                      <tr
                        key={key}
                        className="text-gray-700 dark:text-gray-300"
                      >
                        <td className="py-2 border-b border-gray-200 dark:border-gray-800 font-mono">
                          {key}
                        </td>
                        <td className="py-2 border-b border-gray-200 dark:border-gray-800 font-mono">
                          {String(value)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg
                  className="w-16 h-16 mb-4 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <p className="text-lg">暂无 Headers</p>
                <p className="text-sm mt-1">发送请求后在此查看响应头</p>
              </div>
            )}
          </div>
        )}

        {activeTabState === "console" && (
          <div className="h-full overflow-hidden">
            <InlineConsole />
          </div>
        )}
      </div>
    </div>
  );
}
