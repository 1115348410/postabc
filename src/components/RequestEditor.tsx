import React, { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useRequestStore, useDevToolsStore } from "../stores";
import { sendProxyRequest, cancelCurrentRequest } from "../utils/chrome";
import { HTTP_METHODS } from "../constants";
import type {
  HttpMethod,
  RequestHeader,
  QueryParam,
  BodyType,
  FormDataField,
  RequestConfig,
  ResponseData,
  StreamConfig,
} from "../types";
import ResponsePanel from "./response-viewer/ResponsePanel";
import HeadersEditor from "./request-builder/HeadersEditor";
import BodyEditor from "./request-builder/BodyEditor";
import QueryParamsEditor from "./request-builder/QueryParamsEditor";
import ScriptEditor from "./request-builder/ScriptEditor";
import StreamConfigEditor from "./request-builder/StreamConfigEditor";
import { storageAPI } from "../storage/indexed-db";
import { getEnvironmentVariablesMap } from "../services/environment-service";
import { apiClient } from "../services/api-client";
import { StreamingFieldExtractor, tryParseJson } from "../utils/json-extractor";

type EditorTab =
  | "params"
  | "headers"
  | "body"
  | "stream"
  | "pre-request"
  | "test";

const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enabled: false,
  extractionRules: [],
  displayMode: "concatenated",
};

const getDefaultHeaders = (): RequestHeader[] => [
  { key: "Content-Type", value: "application/json", enabled: true },
  { key: "Accept", value: "*/*", enabled: true },
  { key: "Accept-Encoding", value: "gzip, deflate, br", enabled: true },
  { key: "Connection", value: "keep-alive", enabled: true },
];

interface RequestEditorProps {
  tabId: string;
  initialRequest?: RequestConfig;
  onRequestChange?: (request: RequestConfig) => void;
  // 保存相关
  onSave?: () => void; // 打开保存对话框
  apiUuid?: string; // 已保存接口的UUID（编辑模式）
  parentUuid?: string; // 所属文件夹UUID
}

export default function RequestEditor({
  tabId,
  initialRequest,
  onRequestChange,
  onSave,
  apiUuid,
  parentUuid,
}: RequestEditorProps) {
  const { isSending, setIsSending } = useRequestStore();
  const { updateTabRequest, updateTabResponse } = useDevToolsStore();

  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const streamEventsRef = useRef<any[]>([]);
  const streamExtractorRef = useRef<StreamingFieldExtractor | null>(null);
  const isCancelledRef = useRef(false);

  const [method, setMethod] = useState<HttpMethod>(
    initialRequest?.method || "GET",
  );
  const [url, setUrl] = useState(initialRequest?.url || "");
  const [environment, setEnvironment] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<EditorTab>("params");

  const [headers, setHeaders] = useState<RequestHeader[]>(
    initialRequest?.headers || getDefaultHeaders(),
  );
  const [queryParams, setQueryParams] = useState<QueryParam[]>(
    initialRequest?.queryParams || [{ key: "", value: "", enabled: true }],
  );
  const [bodyType, setBodyType] = useState<BodyType>(
    initialRequest?.bodyType || "none",
  );
  const [jsonBody, setJsonBody] = useState(initialRequest?.body?.json || "");
  const [rawBody, setRawBody] = useState(initialRequest?.body?.raw || "");
  const [formDataFields, setFormDataFields] = useState<FormDataField[]>(
    initialRequest?.body?.form || [
      { key: "", value: "", type: "text", enabled: true },
    ],
  );
  const [urlencodedFields, setUrlencodedFields] = useState<QueryParam[]>(
    initialRequest?.body?.urlencoded || [{ key: "", value: "", enabled: true }],
  );
  const [preRequestScript, setPreRequestScript] = useState(
    initialRequest?.preRequestScript || "",
  );
  const [testScript, setTestScript] = useState(
    initialRequest?.testScript || "",
  );
  const [streamConfig, setStreamConfig] = useState<StreamConfig>(
    initialRequest?.streamConfig || DEFAULT_STREAM_CONFIG,
  );

  useEffect(() => {
    loadEnvironmentVariables();
  }, []);

  const loadEnvironmentVariables = async () => {
    // 从 chrome.storage.local 获取环境变量（与 EnvironmentManager 使用相同的存储）
    const variables = await getEnvironmentVariablesMap();
    console.log("[RequestEditor] 加载环境变量:", variables);
    setEnvironment(variables);
  };

  const updateContentTypeHeader = (newBodyType: BodyType) => {
    const contentTypes: Record<BodyType, string> = {
      none: "",
      json: "application/json",
      "form-data": "multipart/form-data",
      urlencoded: "application/x-www-form-urlencoded",
      raw: "text/plain",
    };
    const newContentType = contentTypes[newBodyType];

    if (newContentType) {
      const existingIndex = headers.findIndex(
        (h) => h.key.toLowerCase() === "content-type",
      );
      if (existingIndex >= 0) {
        setHeaders(
          headers.map((h, i) =>
            i === existingIndex ? { ...h, value: newContentType } : h,
          ),
        );
      } else {
        setHeaders([
          ...headers,
          { key: "Content-Type", value: newContentType, enabled: true },
        ]);
      }
    }
  };

  const handleBodyTypeChange = (newBodyType: BodyType) => {
    setBodyType(newBodyType);
    updateContentTypeHeader(newBodyType);
  };

  const getCurrentRequest = (): RequestConfig => {
    let requestHeaders = headers.filter((h) => h.enabled && h.key);

    if (streamConfig.enabled) {
      const hasAcceptHeader = requestHeaders.some(
        (h) => h.key?.toLowerCase() === "accept",
      );
      if (!hasAcceptHeader) {
        requestHeaders = [
          ...requestHeaders,
          { key: "Accept", value: "text/event-stream", enabled: true },
        ];
      }
    }

    return {
      method,
      url: url.trim(),
      headers: requestHeaders,
      queryParams: queryParams.filter((p) => p.enabled && p.key),
      bodyType,
      body:
        bodyType !== "none"
          ? {
              json: bodyType === "json" ? jsonBody : undefined,
              raw: bodyType === "raw" ? rawBody : undefined,
              form:
                bodyType === "form-data"
                  ? formDataFields.filter((f) => f.enabled && f.key)
                  : undefined,
              urlencoded:
                bodyType === "urlencoded"
                  ? urlencodedFields.filter((f) => f.enabled && f.key)
                  : undefined,
            }
          : undefined,
      preRequestScript,
      testScript,
      timeout: 30000,
      streamConfig,
    };
  };

  // Update store when request changes
  useEffect(() => {
    const request = getCurrentRequest();
    updateTabRequest(tabId, request);
    onRequestChange?.(request);
  }, [
    method,
    url,
    headers,
    queryParams,
    bodyType,
    jsonBody,
    rawBody,
    formDataFields,
    urlencodedFields,
    preRequestScript,
    testScript,
    streamConfig,
  ]);

  const handleSendRequest = useCallback(async () => {
    if (!url.trim()) {
      alert("请填写请求 URL");
      return;
    }

    // 从 chrome.storage.local 获取最新的环境变量
    const latestEnv = await getEnvironmentVariablesMap();
    console.log("[RequestEditor] 发送请求时的环境变量:", latestEnv);
    setEnvironment(latestEnv);

    isCancelledRef.current = false;
    setIsSending(true);
    updateTabResponse(tabId, null);
    setStreamEvents([]);
    streamEventsRef.current = [];

    if (streamConfig.enabled && streamConfig.extractionRules.length > 0) {
      streamExtractorRef.current = new StreamingFieldExtractor(
        streamConfig.extractionRules,
      );
    } else {
      streamExtractorRef.current = null;
    }

    const request = getCurrentRequest();

    // 统一使用流式处理方式，因为 background 端会根据响应 Content-Type 自动判断是否为 SSE 流
    // 这样可以正确处理服务端返回的 SSE 流，无论请求头是否设置 Accept: text/event-stream
    try {
      const result = await sendProxyRequest(request, latestEnv, (data) => {
        if (isCancelledRef.current) return;

        if (data.type === "sse-event") {
          streamEventsRef.current.push(data.event);

          let extractedFields: any = null;
          if (streamExtractorRef.current) {
            const jsonData = tryParseJson(data.event.data);
            if (jsonData) {
              streamExtractorRef.current.process(jsonData);
              extractedFields =
                streamExtractorRef.current.getAccumulatedFields();
            }
          }

          // 使用 flushSync 强制同步更新，确保实时渲染
          flushSync(() => {
            setStreamEvents([...streamEventsRef.current]);
            const streamResponse = {
              status: 200,
              statusText: "Streaming...",
              headers: {},
              body: {
                type: "sse",
                content: [...streamEventsRef.current],
                raw: streamEventsRef.current.map((e: any) => e.data).join("\n"),
                extractedFields: extractedFields,
              },
              size: 0,
              time: 0,
              timestamp: Date.now(),
              logs: [],
            };
            updateTabResponse(tabId, streamResponse);
          });
        }
      });

      if (isCancelledRef.current) return;

      if (result.success && result.data) {
        // 如果是 SSE 流式响应，合并最终响应与提取的字段
        if (result.data.body?.type === "sse") {
          const finalExtractedFields =
            streamExtractorRef.current?.getAccumulatedFields();
          flushSync(() => {
            const sseResponse = {
              ...result.data,
              body: {
                ...result.data.body,
                extractedFields:
                  finalExtractedFields || result.data.body?.extractedFields,
              },
            };
            updateTabResponse(tabId, sseResponse);
          });
        } else {
          // 非 SSE 响应，直接设置响应
          flushSync(() => {
            updateTabResponse(tabId, result.data);
          });
        }
      } else if (result.error) {
        const errorMsg = result.error || "Unknown error";
        flushSync(() => {
          const errorResponse = {
            status: 0,
            statusText: errorMsg,
            headers: {},
            body: { type: "text" as const, content: errorMsg },
            size: 0,
            time: 0,
            timestamp: Date.now(),
            logs: [],
          };
          updateTabResponse(tabId, errorResponse);
        });
      }

      if (!isCancelledRef.current) {
        try {
          await storageAPI.addRequestHistory(request);
        } catch (e) {
          console.error("[PostABC] 保存历史记录失败:", e);
        }
      }
    } catch (error) {
      if (isCancelledRef.current) return;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      flushSync(() => {
        const errorResponse = {
          status: 0,
          statusText: errorMessage,
          headers: {},
          body: { type: "text" as const, content: errorMessage },
          size: 0,
          time: 0,
          timestamp: Date.now(),
          logs: [],
        };
        updateTabResponse(tabId, errorResponse);
      });
    } finally {
      if (!isCancelledRef.current) {
        setIsSending(false);
      }
    }
  }, [
    method,
    url,
    environment,
    headers,
    queryParams,
    bodyType,
    jsonBody,
    rawBody,
    formDataFields,
    urlencodedFields,
    streamConfig,
  ]);

  const handleCancelRequest = useCallback(() => {
    isCancelledRef.current = true;
    cancelCurrentRequest();
    setIsSending(false);
    const cancelResponse = {
      status: 0,
      statusText: "已取消",
      headers: {},
      body: { type: "text" as const, content: "请求已被用户取消" },
      size: 0,
      time: 0,
      timestamp: Date.now(),
      logs: [],
    };
    updateTabResponse(tabId, cancelResponse);
  }, [setIsSending, updateTabResponse, tabId]);

  const handleUpdateRequest = useCallback(async () => {
    if (!apiUuid || !url.trim()) return;

    setIsSending(true);
    try {
      // 直接获取最新的 state 值，而不是通过 getCurrentRequest
      let requestHeaders = headers.filter((h) => h.enabled && h.key);

      if (streamConfig.enabled) {
        const hasAcceptHeader = requestHeaders.some(
          (h) => h.key?.toLowerCase() === "accept",
        );
        if (!hasAcceptHeader) {
          requestHeaders = [
            ...requestHeaders,
            { key: "Accept", value: "text/event-stream", enabled: true },
          ];
        }
      }

      // 构建参数
      const params: Record<string, string> = {};
      queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => {
          params[p.key] = p.value;
        });

      const requestHeadersObj: Record<string, string> = {};
      requestHeaders.forEach((h) => {
        requestHeadersObj[h.key] = h.value;
      });

      // 获取最新的 body 内容
      let bodyContent = "{}";
      if (bodyType === "json") {
        bodyContent = jsonBody || "{}";
      } else if (bodyType === "raw") {
        bodyContent = rawBody || "";
      } else if (bodyType === "form-data") {
        bodyContent = JSON.stringify(
          formDataFields.filter((f) => f.enabled && f.key),
        );
      } else if (bodyType === "urlencoded") {
        bodyContent = JSON.stringify(
          urlencodedFields.filter((f) => f.enabled && f.key),
        );
      }

      // 调用更新API
      await apiClient.updateApi(apiUuid, {
        method: method,
        url: url.trim(),
        params: JSON.stringify(params),
        headers: JSON.stringify(requestHeadersObj),
        bodyType: bodyType || "json",
        bodyContent: bodyContent,
        preScript: preRequestScript || "",
        testScript: testScript || "",
        sseFlag: streamConfig.enabled || false,
        ssePaths: JSON.stringify(streamConfig.extractionRules || []),
      });

      alert("接口更新成功");
    } catch (error) {
      console.error("[PostABC] 更新接口失败:", error);
      alert(
        "更新失败: " + (error instanceof Error ? error.message : "未知错误"),
      );
    } finally {
      setIsSending(false);
    }
  }, [
    apiUuid,
    url,
    method,
    headers,
    queryParams,
    bodyType,
    jsonBody,
    rawBody,
    formDataFields,
    urlencodedFields,
    preRequestScript,
    testScript,
    streamConfig,
  ]);

  const handleSaveOrUpdate = useCallback(() => {
    if (apiUuid) {
      // 已保存接口 - 直接更新，无需弹窗
      handleUpdateRequest();
    } else {
      // 新接口 - 打开保存对话框
      onSave?.();
    }
  }, [apiUuid, onSave, handleUpdateRequest]);

  const loadRequest = (request: RequestConfig) => {
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers?.length ? request.headers : getDefaultHeaders());
    setQueryParams(
      request.queryParams?.length
        ? request.queryParams
        : [{ key: "", value: "", enabled: true }],
    );
    setBodyType(request.bodyType);

    if (request.body) {
      if (request.bodyType === "json" && request.body.json) {
        setJsonBody(request.body.json);
      }
      if (request.bodyType === "raw" && request.body.raw) {
        setRawBody(request.body.raw);
      }
      if (request.bodyType === "form-data" && request.body.form) {
        setFormDataFields(request.body.form);
      }
      if (request.bodyType === "urlencoded" && request.body.urlencoded) {
        setUrlencodedFields(request.body.urlencoded);
      }
    }

    setPreRequestScript(request.preRequestScript || "");
    setTestScript(request.testScript || "");
    setStreamConfig(request.streamConfig || DEFAULT_STREAM_CONFIG);
  };

  const tabs: { id: EditorTab; label: string; count?: number }[] = [
    {
      id: "params",
      label: "Params",
      count: queryParams.filter((p) => p.enabled && p.key).length,
    },
    {
      id: "headers",
      label: "Headers",
      count: headers.filter((h) => h.enabled && h.key).length,
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
      label: "前置脚本",
      count: preRequestScript ? 1 : undefined,
    },
    { id: "test", label: "测试脚本", count: testScript ? 1 : undefined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-800">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded px-3 py-2 min-w-[100px] focus:outline-none focus:border-primary-500"
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
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入请求 URL"
          className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendRequest();
            }
          }}
        />

        {isSending ? (
          <button
            onClick={handleCancelRequest}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            取消
          </button>
        ) : (
          <>
            <button
              onClick={handleSendRequest}
              disabled={!url.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors"
            >
              发送
            </button>
            {onSave && (
              <button
                onClick={handleSaveOrUpdate}
                disabled={!url.trim()}
                className={`${apiUuid ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"} disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-1`}
                title={apiUuid ? "更新接口" : "保存为新接口"}
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {apiUuid ? "更新" : "保存"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Editor Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-gray-800"
                : "text-gray-500 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-400"
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

      {/* Editor Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        {activeTab === "params" && (
          <QueryParamsEditor params={queryParams} onChange={setQueryParams} />
        )}
        {activeTab === "headers" && (
          <HeadersEditor headers={headers} onChange={setHeaders} />
        )}
        {activeTab === "body" && (
          <BodyEditor
            bodyType={bodyType}
            onChangeBodyType={handleBodyTypeChange}
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
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                在发送请求前执行的 Node.js 脚本
              </p>
            </div>
            <ScriptEditor
              script={preRequestScript}
              onChange={setPreRequestScript}
              type="pre-request"
            />
          </div>
        )}
        {activeTab === "test" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                收到响应后执行的测试脚本
              </p>
            </div>
            <ScriptEditor
              script={testScript}
              onChange={setTestScript}
              type="test"
            />
          </div>
        )}
      </div>
    </div>
  );
}
