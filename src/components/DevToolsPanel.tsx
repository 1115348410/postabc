import React, { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useDevToolsStore } from "../stores";
import { sendProxyRequest } from "../utils/chrome";
import { HTTP_METHODS } from "../constants";
import type {
  HttpMethod,
  RequestHeader,
  QueryParam,
  BodyType,
  FormDataField,
  RequestConfig,
  StreamConfig,
} from "../types";
import StreamConfigEditor from "./request-builder/StreamConfigEditor";

type RequestTab =
  | "params"
  | "headers"
  | "body"
  | "stream"
  | "pre-request"
  | "test";
import ResponsePanel from "./response-viewer/ResponsePanel";
import HeadersEditor from "./request-builder/HeadersEditor";
import BodyEditor from "./request-builder/BodyEditor";
import QueryParamsEditor from "./request-builder/QueryParamsEditor";
import ScriptEditor from "./request-builder/ScriptEditor";
import EnvironmentManager from "./EnvironmentManager";
import BuiltinVariablesDrawer from "./BuiltinVariablesDrawer";
import { storageAPI } from "../storage/indexed-db";
import { ApiSyncPanel } from "./ApiSyncPanel";
import { validateRequestConfig, sanitizeUrl } from "../utils/validation";
import { getEnvironmentVariablesMap } from "../services/environment-service";

// 从 URL 中解析查询参数（手动解析，更可靠）
function parseQueryParamsFromUrl(urlString: string): QueryParam[] {
  console.log("[parseQueryParamsFromUrl] 开始解析:", urlString);

  // 查找查询字符串的起始位置
  const queryIndex = urlString.indexOf("?");
  if (queryIndex === -1) {
    console.log("[parseQueryParamsFromUrl] 没有找到查询参数");
    return [];
  }

  // 提取查询字符串部分（去掉 hash 部分）
  let queryString = urlString.substring(queryIndex + 1);
  const hashIndex = queryString.indexOf("#");
  if (hashIndex !== -1) {
    queryString = queryString.substring(0, hashIndex);
  }

  console.log("[parseQueryParamsFromUrl] 查询字符串:", queryString);

  if (!queryString.trim()) {
    return [];
  }

  const params: QueryParam[] = [];
  const pairs = queryString.split("&");

  for (const pair of pairs) {
    if (!pair.trim()) continue;

    const equalIndex = pair.indexOf("=");
    if (equalIndex === -1) {
      // 没有 = 号，只有 key
      params.push({
        key: decodeURIComponent(pair.trim()),
        value: "",
        enabled: true,
      });
    } else {
      const key = pair.substring(0, equalIndex);
      const value = pair.substring(equalIndex + 1);
      params.push({
        key: decodeURIComponent(key.trim()),
        value: decodeURIComponent(value.trim()),
        enabled: true,
      });
    }
  }

  console.log("[parseQueryParamsFromUrl] 解析结果:", params);
  return params;
}

// 从 URL 中移除查询参数，返回基础 URL
function getBaseUrl(urlString: string): string {
  const queryIndex = urlString.indexOf("?");
  const hashIndex = urlString.indexOf("#");

  if (queryIndex === -1) {
    return urlString;
  }

  // 截取 ? 之前的部分
  let baseUrl = urlString.substring(0, queryIndex);

  // 如果有 hash，保留 hash
  if (hashIndex !== -1 && hashIndex > queryIndex) {
    baseUrl += urlString.substring(hashIndex);
  }

  return baseUrl;
}

// 从 request.body 对象中提取字符串类型的 body 内容
function extractBodyString(
  body: RequestConfig["body"],
  bodyType: BodyType,
): string | undefined {
  if (!body) return undefined;

  switch (bodyType) {
    case "json":
      return body.json;
    case "raw":
      return body.raw;
    case "form-data":
      if (body.form && body.form.length > 0) {
        return body.form
          .map(
            (f) =>
              `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`,
          )
          .join("&");
      }
      return undefined;
    case "urlencoded":
      if (body.urlencoded && body.urlencoded.length > 0) {
        return body.urlencoded
          .map(
            (f) =>
              `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`,
          )
          .join("&");
      }
      return undefined;
    default:
      return undefined;
  }
}

// 将查询参数合并到 URL 中
function buildUrlWithParams(baseUrl: string, params: QueryParam[]): string {
  try {
    const url = new URL(baseUrl);
    params.forEach((param) => {
      if (param.enabled && param.key.trim()) {
        url.searchParams.set(param.key, param.value);
      }
    });
    return url.toString();
  } catch {
    // URL 无效时，尝试手动拼接
    const enabledParams = params.filter((p) => p.enabled && p.key.trim());
    if (enabledParams.length === 0) {
      return baseUrl;
    }
    const queryString = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${queryString}`;
  }
}

// 默认流式配置
const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enabled: false,
  extractionRules: [],
  displayMode: "concatenated",
};

export default function DevToolsPanel() {
  const { isSending, setCurrentRequest, setIsSending, setResponse } =
    useDevToolsStore();

  const streamEventsRef = useRef<any[]>([]);
  // 用于流式响应的初始时间戳，确保流式更新时 timestamp 不变
  const streamTimestampRef = useRef<number | null>(null);
  // 使用本地状态来强制触发流式渲染更新
  const [streamUpdateCounter, setStreamUpdateCounter] = useState(0);

  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [environment, setEnvironment] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<RequestTab>("params");

  // Request data state
  const [headers, setHeaders] = useState<RequestHeader[]>([]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);

  // 用于防止循环更新的标记
  const isUpdatingFromParamsRef = useRef(false);

  // URL 和 QueryParams 联动：当 URL 变化时，解析查询参数并同步到 queryParams
  const handleUrlChange = useCallback((newUrl: string) => {
    // 如果是从 params 更新触发的，跳过解析
    if (isUpdatingFromParamsRef.current) {
      isUpdatingFromParamsRef.current = false;
      setUrl(newUrl);
      return;
    }

    console.log("[handleUrlChange] 输入 URL:", newUrl);
    const parsedParams = parseQueryParamsFromUrl(newUrl);
    console.log("[handleUrlChange] 解析出的参数:", parsedParams);
    if (parsedParams.length > 0) {
      // 如果解析出参数，更新 queryParams
      setQueryParams(parsedParams);
      // 同时更新 URL 为不带查询参数的基础 URL
      const baseUrl = getBaseUrl(newUrl);
      console.log("[handleUrlChange] 基础 URL:", baseUrl);
      setUrl(baseUrl);
    } else {
      // 没有参数时，直接设置 URL
      setUrl(newUrl);
    }
  }, []);

  // URL 和 QueryParams 联动：当 queryParams 变化时，更新 URL
  const handleQueryParamsChange = useCallback(
    (newParams: QueryParam[]) => {
      setQueryParams(newParams);
      // 标记正在从 params 更新，避免循环
      isUpdatingFromParamsRef.current = true;
      // 将 queryParams 合并到当前 URL
      const newUrl = buildUrlWithParams(url, newParams);
      setUrl(newUrl);
    },
    [url],
  );
  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [jsonBody, setJsonBody] = useState("");
  const [rawBody, setRawBody] = useState("");
  const [formDataFields, setFormDataFields] = useState<FormDataField[]>([]);
  const [urlencodedFields, setUrlencodedFields] = useState<QueryParam[]>([]);
  const [preRequestScript, setPreRequestScript] = useState("");
  const [testScript, setTestScript] = useState("");
  const [streamConfig, setStreamConfig] = useState<StreamConfig>(
    DEFAULT_STREAM_CONFIG,
  );

  // Modal states
  const [showEnvironmentManager, setShowEnvironmentManager] = useState(false);
  const [showApiSync, setShowApiSync] = useState(false);
  const [showBuiltinVarsDrawer, setShowBuiltinVarsDrawer] = useState(false);

  // Load environment variables on mount - 从缓存加载
  useEffect(() => {
    loadEnvironmentVariables();
  }, []);

  const loadEnvironmentVariables = async () => {
    console.log("[DevToolsPanel] 开始加载环境变量...");
    // 优先从 chrome.storage 缓存加载
    const cachedVars = await getEnvironmentVariablesMap();
    console.log("[DevToolsPanel] getEnvironmentVariablesMap 返回:", cachedVars);
    if (Object.keys(cachedVars).length > 0) {
      console.log("[DevToolsPanel] 从缓存加载环境变量:", cachedVars);
      setEnvironment(cachedVars);
    } else {
      // 回退到 IndexedDB
      console.log("[DevToolsPanel] 缓存为空，尝试从 IndexedDB 加载...");
      const variables =
        await storageAPI.getActiveEnvironmentVariables("global");
      console.log("[DevToolsPanel] IndexedDB 返回的环境变量:", variables);
      setEnvironment(variables);
    }
  };

  // 处理环境变量更新（来自 EnvironmentManager）
  const handleEnvironmentChange = useCallback((vars: Record<string, any>) => {
    console.log("[DevToolsPanel] 环境变量已更新:", Object.keys(vars));
    setEnvironment(vars);
  }, []);

  const handleSendRequest = useCallback(async () => {
    if (!url.trim()) {
      setResponse({
        status: 0,
        statusText: "URL is required",
        headers: {},
        body: {
          type: "text" as const,
          content: "Please enter a URL",
        },
        size: 0,
        time: 0,
        timestamp: Date.now(),
        logs: [],
        request: {
          method,
          url: url.trim(),
          headers: headers
            .filter((h) => h.enabled)
            .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
          body:
            bodyType !== "none"
              ? bodyType === "json"
                ? jsonBody
                : rawBody
              : undefined,
        },
      });
      return;
    }

    // 清理和验证URL
    const sanitizedUrl = sanitizeUrl(url.trim());
    if (!sanitizedUrl) {
      setResponse({
        status: 0,
        statusText: "Invalid URL",
        headers: {},
        body: {
          type: "text" as const,
          content: "The URL contains invalid characters or protocols",
        },
        size: 0,
        time: 0,
        timestamp: Date.now(),
        logs: [],
        request: {
          method,
          url: sanitizedUrl || url.trim(),
          headers: headers
            .filter((h) => h.enabled)
            .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
          body:
            bodyType !== "none"
              ? bodyType === "json"
                ? jsonBody
                : rawBody
              : undefined,
        },
      });
      return;
    }

    // 构建请求对象
    const request: RequestConfig = {
      method,
      url: sanitizedUrl,
      headers: headers.filter((h) => h.enabled),
      queryParams: queryParams.filter((p) => p.enabled),
      bodyType,
      body:
        bodyType !== "none"
          ? {
              json: bodyType === "json" ? jsonBody : undefined,
              raw: bodyType === "raw" ? rawBody : undefined,
              form:
                bodyType === "form-data"
                  ? formDataFields.filter((f) => f.enabled)
                  : undefined,
              urlencoded:
                bodyType === "urlencoded"
                  ? urlencodedFields.filter((f) => f.enabled)
                  : undefined,
            }
          : undefined,
      preRequestScript,
      testScript,
      timeout: 30000,
      streamConfig,
    };

    // 验证请求配置
    const validation = validateRequestConfig(request);
    if (!validation.isValid) {
      setResponse({
        status: 0,
        statusText: "Validation Error",
        headers: {},
        body: {
          type: "text" as const,
          content: `Request validation failed: ${validation.errors.join(", ")}`,
        },
        size: 0,
        time: 0,
        timestamp: Date.now(),
        logs: [],
        request: {
          method: request.method,
          url: request.url,
          headers: (
            request.headers as Array<{ key: string; value: string }>
          ).reduce(
            (acc, h) => ({ ...acc, [h.key]: h.value }),
            {} as Record<string, string>,
          ),
          body: extractBodyString(request.body, bodyType),
        },
      });
      return;
    }

    setIsSending(true);
    setResponse(null);
    streamEventsRef.current = [];
    streamTimestampRef.current = null; // 重置流式时间戳
    setStreamUpdateCounter(0); // 重置更新计数器

    // 调试：打印发送请求时的环境变量
    console.log("[DevToolsPanel] ========== 发送请求调试 ==========");
    console.log("[DevToolsPanel] 原始 URL:", url);
    console.log("[DevToolsPanel] 环境变量:", JSON.stringify(environment));
    console.log(
      "[DevToolsPanel] 环境变量 keys:",
      Object.keys(environment || {}),
    );
    console.log("[DevToolsPanel] ===================================");

    try {
      // 始终使用流式请求处理，根据响应 Content-Type 自动判断
      const result = await sendProxyRequest(request, environment, (data) => {
        if (data.type === "sse-event") {
          streamEventsRef.current.push(data.event);

          // 使用固定的 timestamp，只在第一个事件时设置
          if (streamTimestampRef.current === null) {
            streamTimestampRef.current = Date.now();
          }

          const eventCount = streamEventsRef.current.length;
          const currentTimestamp = streamTimestampRef.current;

          // 使用 flushSync 强制同步更新
          flushSync(() => {
            setResponse({
              status: 200,
              statusText: `Streaming... (${eventCount} events)`,
              headers: {},
              body: {
                type: "sse",
                content: [...streamEventsRef.current],
                raw: streamEventsRef.current.map((e: any) => e.data).join("\n"),
              },
              size: 0,
              time: Date.now() - (currentTimestamp || Date.now()),
              timestamp: currentTimestamp,
              logs: [],
              request: {
                method: request.method,
                url: request.url,
                headers: (
                  request.headers as Array<{ key: string; value: string }>
                ).reduce(
                  (acc, h) => ({ ...acc, [h.key]: h.value }),
                  {} as Record<string, string>,
                ),
                body: extractBodyString(request.body, bodyType),
              },
            });
            // 更新计数器以触发额外的渲染
            setStreamUpdateCounter((prev) => prev + 1);
          });
        }
      });

      if (result.success && result.data) {
        setResponse({
          ...result.data,
          request: {
            method: request.method,
            url: request.url,
            headers: (
              request.headers as Array<{ key: string; value: string }>
            ).reduce(
              (acc, h) => ({ ...acc, [h.key]: h.value }),
              {} as Record<string, string>,
            ),
            body:
              request.bodyType !== "none"
                ? request.bodyType === "json"
                  ? (request.body as any)?.json || jsonBody
                  : (request.body as any)?.raw || rawBody
                : undefined,
          },
        });
      } else if (result.error) {
        // 如果背景脚本返回了 request 信息，优先使用
        const errorRequest = (result as any).request;
        setResponse({
          status: 0,
          statusText: result.error,
          headers: {},
          body: {
            type: "text" as const,
            content: result.error,
          },
          size: 0,
          time: 0,
          timestamp: Date.now(),
          logs: [],
          request: errorRequest || {
            method: request.method,
            url: request.url,
            headers: (
              request.headers as Array<{ key: string; value: string }>
            ).reduce(
              (acc, h) => ({ ...acc, [h.key]: h.value }),
              {} as Record<string, string>,
            ),
            body:
              bodyType !== "none"
                ? bodyType === "json"
                  ? jsonBody
                  : rawBody
                : undefined,
          },
        });
      }
    } catch (error) {
      setResponse({
        status: 0,
        statusText: error instanceof Error ? error.message : "Unknown error",
        headers: {},
        body: {
          type: "text" as const,
          content: error instanceof Error ? error.message : "Unknown error",
        },
        size: 0,
        time: 0,
        timestamp: Date.now(),
        logs: [],
        request: {
          method: request.method,
          url: request.url,
          headers: (
            request.headers as Array<{ key: string; value: string }>
          ).reduce(
            (acc, h) => ({ ...acc, [h.key]: h.value }),
            {} as Record<string, string>,
          ),
          body:
            bodyType !== "none"
              ? bodyType === "json"
                ? jsonBody
                : rawBody
              : undefined,
        },
      });
    } finally {
      setIsSending(false);
    }
  }, [
    method,
    url,
    environment,
    setIsSending,
    setResponse,
    headers,
    queryParams,
    bodyType,
    jsonBody,
    rawBody,
    formDataFields,
    urlencodedFields,
    preRequestScript,
    testScript,
  ]);

  const tabs: { id: RequestTab; label: string; count?: number }[] = [
    {
      id: "params",
      label: "Params",
      count: queryParams.filter((p) => p.enabled).length,
    },
    {
      id: "headers",
      label: "Headers",
      count: headers.filter((h) => h.enabled).length,
    },
    { id: "body", label: "Body" },
    {
      id: "stream",
      label: "Stream",
      count:
        streamConfig.enabled && streamConfig.extractionRules.length > 0
          ? streamConfig.extractionRules.length
          : undefined,
    },
    {
      id: "pre-request",
      label: "Pre-request",
      count: preRequestScript ? 1 : undefined,
    },
    { id: "test", label: "Test", count: testScript ? 1 : undefined },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">PostABC</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEnvironmentManager(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Environment Variables"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowApiSync(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="API Sync"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowBuiltinVarsDrawer(!showBuiltinVarsDrawer)}
            className={`p-2 transition-colors ${
              showBuiltinVarsDrawer
                ? "text-primary-400 bg-primary-900/20"
                : "text-gray-400 hover:text-white"
            }`}
            title="内置变量参考"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Request */}
        <div className="w-1/2 flex flex-col border-r border-gray-800">
          <div className="flex gap-2 p-4 border-b border-gray-800">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 min-w-[100px] focus:outline-none focus:border-primary-500"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onPaste={(e) => {
                // 获取粘贴的内容
                const pastedText = e.clipboardData.getData("text");
                if (pastedText && pastedText.includes("?")) {
                  // 阻止默认粘贴行为，手动处理
                  e.preventDefault();
                  // 直接处理粘贴的 URL
                  handleUrlChange(pastedText);
                }
              }}
              placeholder="Enter request URL"
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendRequest();
                }
              }}
            />

            <button
              onClick={handleSendRequest}
              disabled={isSending || !url.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>

          {/* Request tabs */}
          <div className="flex border-b border-gray-800 bg-gray-900 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-white border-b-2 border-primary-500 bg-gray-800"
                    : "text-gray-500 border-b-2 border-transparent hover:text-gray-400"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Request content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "params" && (
              <QueryParamsEditor
                params={queryParams}
                onChange={handleQueryParamsChange}
              />
            )}
            {activeTab === "headers" && (
              <HeadersEditor
                headers={headers}
                onChange={setHeaders}
                onShowBuiltinVars={() => setShowBuiltinVarsDrawer(true)}
              />
            )}
            {activeTab === "body" && (
              <BodyEditor
                bodyType={bodyType}
                onChangeBodyType={setBodyType}
                jsonBody={jsonBody}
                onChangeJsonBody={setJsonBody}
                rawBody={rawBody}
                onChangeRawBody={setRawBody}
                formDataFields={formDataFields}
                onChangeFormDataFields={setFormDataFields}
                urlencodedFields={urlencodedFields}
                onChangeUrlencodedFields={setUrlencodedFields}
              />
            )}
            {activeTab === "stream" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <StreamConfigEditor
                  config={streamConfig}
                  onChange={setStreamConfig}
                />
              </div>
            )}
            {activeTab === "pre-request" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <ScriptEditor
                  script={preRequestScript}
                  onChange={setPreRequestScript}
                  type="pre-request"
                />
              </div>
            )}
            {activeTab === "test" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <ScriptEditor
                  script={testScript}
                  onChange={setTestScript}
                  type="test"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Response */}
        <div className="w-1/2 flex flex-col">
          <ResponsePanel streamConfig={streamConfig} />
        </div>
      </div>

      {/* Modals */}
      <EnvironmentManager
        isOpen={showEnvironmentManager}
        onClose={() => setShowEnvironmentManager(false)}
        onVariablesChange={handleEnvironmentChange}
      />
      {showApiSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                API数据同步
              </h2>
              <button
                onClick={() => setShowApiSync(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            <div className="flex-1 overflow-auto p-4">
              <ApiSyncPanel />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex justify-end">
              <button
                onClick={() => setShowApiSync(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm font-medium transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 内置变量帮助抽屉 */}
      <BuiltinVariablesDrawer
        isOpen={showBuiltinVarsDrawer}
        onClose={() => setShowBuiltinVarsDrawer(false)}
      />
    </div>
  );
}
