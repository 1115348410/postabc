import React, { useState, useMemo, useRef } from "react";
import type { BodyType, FormDataField, QueryParam } from "../../types";

interface JsonValidationResult {
  isValid: boolean;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

function validateJson(json: string): JsonValidationResult {
  if (!json.trim()) {
    return { isValid: true };
  }
  try {
    JSON.parse(json);
    return { isValid: true };
  } catch (e) {
    if (e instanceof SyntaxError) {
      const match = e.message.match(/position\s+(\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = json.substring(0, position).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return {
          isValid: false,
          error: e.message,
          errorLine: line,
          errorColumn: column,
        };
      }
      return { isValid: false, error: e.message };
    }
    return { isValid: false, error: String(e) };
  }
}

interface BodyEditorProps {
  bodyType: BodyType;
  onChangeBodyType: (type: BodyType) => void;
  jsonBody?: string;
  onChangeJsonBody?: (json: string) => void;
  rawBody?: string;
  onChangeRawBody?: (raw: string) => void;
  formDataFields?: FormDataField[];
  onChangeFormDataFields?: (fields: FormDataField[]) => void;
  urlencodedFields?: QueryParam[];
  onChangeUrlencodedFields?: (fields: QueryParam[]) => void;
}

export default function BodyEditor({
  bodyType,
  onChangeBodyType,
  jsonBody = "",
  onChangeJsonBody,
  rawBody = "",
  onChangeRawBody,
  formDataFields = [],
  onChangeFormDataFields,
  urlencodedFields = [],
  onChangeUrlencodedFields,
}: BodyEditorProps) {
  const bodyTypes: { value: BodyType; label: string }[] = [
    { value: "none", label: "None" },
    { value: "json", label: "JSON" },
    { value: "form-data", label: "Form Data" },
    { value: "urlencoded", label: "URL Encoded" },
    { value: "raw", label: "Raw" },
  ];

  // All hooks at top level
  const [urlencodedNewKey, setUrlencodedNewKey] = useState("");
  const [urlencodedNewValue, setUrlencodedNewValue] = useState("");
  const [formDataNewKey, setFormDataNewKey] = useState("");
  const [formDataNewValue, setFormDataNewValue] = useState("");
  const [formDataNewFieldType, setFormDataNewFieldType] = useState<
    "text" | "file"
  >("text");
  const [formDataSelectedFile, setFormDataSelectedFile] = useState<File | null>(
    null,
  );
  const formDataFileInputRef = useRef<HTMLInputElement>(null);

  // Form Data handlers
  const formDataHandleAddField = () => {
    if (!formDataNewKey.trim()) return;
    if (formDataNewFieldType === "file" && formDataSelectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result;
        onChangeFormDataFields?.([
          ...formDataFields,
          {
            key: formDataNewKey.trim(),
            value: formDataSelectedFile.name,
            type: "file",
            enabled: true,
            fileData: {
              name: formDataSelectedFile.name,
              type: formDataSelectedFile.type,
              data: arrayBuffer as ArrayBuffer,
            },
          },
        ]);
      };
      reader.readAsArrayBuffer(formDataSelectedFile);
    } else if (formDataNewFieldType === "file" && !formDataSelectedFile) {
      onChangeFormDataFields?.([
        ...formDataFields,
        {
          key: formDataNewKey.trim(),
          value: "",
          type: "file",
          enabled: true,
        },
      ]);
    } else {
      onChangeFormDataFields?.([
        ...formDataFields,
        {
          key: formDataNewKey.trim(),
          value: formDataNewValue.trim(),
          type: "text",
          enabled: true,
        },
      ]);
    }
    setFormDataNewKey("");
    setFormDataNewValue("");
    setFormDataNewFieldType("text");
    setFormDataSelectedFile(null);
  };

  const formDataHandleRemoveField = (index: number) =>
    onChangeFormDataFields?.(formDataFields.filter((_, i) => i !== index));
  const formDataHandleToggleField = (index: number) =>
    onChangeFormDataFields?.(
      formDataFields.map((f, i) =>
        i === index ? { ...f, enabled: !f.enabled } : f,
      ),
    );
  const formDataHandleUpdateKey = (index: number, key: string) =>
    onChangeFormDataFields?.(
      formDataFields.map((f, i) => (i === index ? { ...f, key } : f)),
    );
  const formDataHandleUpdateValue = (index: number, value: string) =>
    onChangeFormDataFields?.(
      formDataFields.map((f, i) => (i === index ? { ...f, value } : f)),
    );
  const formDataHandleUpdateFieldType = (
    index: number,
    newType: "text" | "file",
  ) =>
    onChangeFormDataFields?.(
      formDataFields.map((f, i) =>
        i === index
          ? {
              ...f,
              type: newType,
              value: newType === "text" ? f.value : "",
              fileData: newType === "text" ? undefined : f.fileData,
            }
          : f,
      ),
    );
  const formDataHandleFileSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      onChangeFormDataFields?.(
        formDataFields.map((f, i) =>
          i === index
            ? {
                ...f,
                value: file.name,
                fileData: {
                  name: file.name,
                  type: file.type,
                  data: arrayBuffer as ArrayBuffer,
                },
              }
            : f,
        ),
      );
    };
    reader.readAsArrayBuffer(file);
  };

  // URL Encoded handlers
  const urlencodedHandleAddField = () => {
    if (!urlencodedNewKey.trim()) return;
    onChangeUrlencodedFields?.([
      ...urlencodedFields,
      {
        key: urlencodedNewKey.trim(),
        value: urlencodedNewValue.trim(),
        enabled: true,
      },
    ]);
    setUrlencodedNewKey("");
    setUrlencodedNewValue("");
  };

  // JSON validation
  const jsonValidation = useMemo(() => validateJson(jsonBody), [jsonBody]);

  // Render functions
  const renderJsonBody = () => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            Body
          </span>
          <select
            value={bodyType}
            onChange={(e) => onChangeBodyType(e.target.value as BodyType)}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
          >
            {bodyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {jsonBody.trim() && (
            <div className="flex items-center gap-1.5">
              {jsonValidation.isValid ? (
                <>
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-xs text-green-500">Valid JSON</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-red-500">Invalid JSON</span>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => {
              try {
                const formatted = JSON.stringify(JSON.parse(jsonBody), null, 2);
                onChangeJsonBody?.(formatted);
              } catch {}
            }}
            className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors px-2 py-1 border border-gray-300 dark:border-gray-700 rounded"
          >
            Pretty Print
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4 flex flex-col gap-2">
        <textarea
          value={jsonBody}
          onChange={(e) => onChangeJsonBody?.(e.target.value)}
          placeholder='{"key": "value"}'
          className={`w-full flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base font-mono border rounded p-3 focus:outline-none resize-none ${jsonBody.trim() && !jsonValidation.isValid ? "border-red-400 dark:border-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:border-primary-500"}`}
          spellCheck={false}
        />
        {jsonBody.trim() && !jsonValidation.isValid && jsonValidation.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 flex items-start gap-2">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-red-600 dark:text-red-400">
              <span className="font-medium">JSON Error: </span>
              {jsonValidation.errorLine && jsonValidation.errorColumn ? (
                <span>
                  Line {jsonValidation.errorLine}, Column{" "}
                  {jsonValidation.errorColumn}: {jsonValidation.error}
                </span>
              ) : (
                <span>{jsonValidation.error}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderRawBody = () => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Body
        </span>
        <select
          value={bodyType}
          onChange={(e) => onChangeBodyType(e.target.value as BodyType)}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          {bodyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <textarea
          value={rawBody}
          onChange={(e) => onChangeRawBody?.(e.target.value)}
          placeholder="Enter raw body content..."
          className="w-full h-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base font-mono border border-gray-300 dark:border-gray-700 rounded p-3 focus:outline-none focus:border-primary-500 resize-none"
          spellCheck={false}
        />
      </div>
    </div>
  );

  const renderFormDataBody = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Body
        </span>
        <select
          value={bodyType}
          onChange={(e) => onChangeBodyType(e.target.value as BodyType)}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          {bodyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <span className="text-gray-400 dark:text-gray-600 text-xs">
          {formDataFields.filter((f) => f.enabled).length} active
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-28" />
            <col className="w-48" />
            <col className="w-auto" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-2 text-left font-medium"></th>
              <th className="px-2 py-2 text-left font-medium">Type</th>
              <th className="px-2 py-2 text-left font-medium">Key</th>
              <th className="px-2 py-2 text-left font-medium">Value</th>
              <th className="px-2 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {formDataFields.map((field, index) => (
              <tr
                key={index}
                className={`border-b border-gray-100 dark:border-gray-800 ${field.enabled ? "" : "opacity-50"}`}
              >
                <td className="px-2 py-1.5 w-10">
                  <button
                    onClick={() => formDataHandleToggleField(index)}
                    className={`w-5 h-5 flex items-center justify-center rounded border ${field.enabled ? "border-primary-500 bg-primary-500" : "border-gray-300 dark:border-gray-600"}`}
                    aria-label={field.enabled ? "Disable" : "Enable"}
                  >
                    {field.enabled && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="px-2 py-1.5 w-28">
                  <select
                    value={field.type}
                    onChange={(e) =>
                      formDataHandleUpdateFieldType(
                        index,
                        e.target.value as "text" | "file",
                      )
                    }
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 w-48">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) =>
                      formDataHandleUpdateKey(index, e.target.value)
                    }
                    placeholder="Key"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                </td>
                <td className="px-2 py-1.5 w-auto min-w-0">
                  {field.type === "text" ? (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        formDataHandleUpdateValue(index, e.target.value)
                      }
                      placeholder="Value"
                      className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {field.fileData ? (
                        <span className="flex-1 text-gray-600 dark:text-gray-400 text-sm truncate">
                          {field.fileData.name}
                        </span>
                      ) : (
                        <span className="flex-1 text-gray-400 dark:text-gray-500 text-sm italic">
                          No file selected
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) formDataHandleFileSelect(index, file);
                          };
                          input.click();
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Choose
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 w-10">
                  <button
                    onClick={() => formDataHandleRemoveField(index)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                    aria-label="Remove field"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <td className="px-2 py-1.5 w-10">
                <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
              </td>
              <td className="px-2 py-1.5 w-28">
                <select
                  value={formDataNewFieldType}
                  onChange={(e) =>
                    setFormDataNewFieldType(e.target.value as "text" | "file")
                  }
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </td>
              <td className="px-2 py-1.5 w-48">
                <input
                  type="text"
                  value={formDataNewKey}
                  onChange={(e) => setFormDataNewKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formDataNewKey.trim())
                      formDataHandleAddField();
                  }}
                  placeholder="Key"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                />
              </td>
              <td className="px-2 py-1.5 w-auto min-w-0">
                {formDataNewFieldType === "text" ? (
                  <input
                    type="text"
                    value={formDataNewValue}
                    onChange={(e) => setFormDataNewValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && formDataNewKey.trim())
                        formDataHandleAddField();
                    }}
                    placeholder="Value (Enter to add)"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {formDataSelectedFile ? (
                      <span className="flex-1 text-gray-600 dark:text-gray-400 text-sm truncate">
                        {formDataSelectedFile.name}
                      </span>
                    ) : (
                      <span className="flex-1 text-gray-400 dark:text-gray-500 text-sm italic">
                        No file selected
                      </span>
                    )}
                    <input
                      ref={formDataFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormDataSelectedFile(file);
                      }}
                    />
                    <button
                      onClick={() => formDataFileInputRef.current?.click()}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Choose
                    </button>
                  </div>
                )}
              </td>
              <td className="px-2 py-1.5 w-10">
                <button
                  onClick={formDataHandleAddField}
                  disabled={
                    !formDataNewKey.trim() ||
                    (formDataNewFieldType === "file" && !formDataSelectedFile)
                  }
                  className="p-1 text-primary-500 hover:text-primary-600 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Add field"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        {formDataFields.length === 0 && (
          <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
            Enter key and value, press Enter to add
          </div>
        )}
      </div>
    </div>
  );

  const renderUrlencodedBody = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Body
        </span>
        <select
          value={bodyType}
          onChange={(e) => onChangeBodyType(e.target.value as BodyType)}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          {bodyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <span className="text-gray-400 dark:text-gray-600 text-xs">
          {urlencodedFields.filter((f) => f.enabled).length} active
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="w-10 px-2 py-2 text-left font-medium"></th>
              <th className="px-2 py-2 text-left font-medium">Key</th>
              <th className="px-2 py-2 text-left font-medium">Value</th>
              <th className="w-10 px-2 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {urlencodedFields.map((field, index) => (
              <tr
                key={index}
                className={`border-b border-gray-100 dark:border-gray-800 ${field.enabled ? "" : "opacity-50"}`}
              >
                <td className="px-2 py-1.5">
                  <button
                    onClick={() =>
                      onChangeUrlencodedFields?.(
                        urlencodedFields.map((f, i) =>
                          i === index ? { ...f, enabled: !f.enabled } : f,
                        ),
                      )
                    }
                    className={`w-5 h-5 flex items-center justify-center rounded border ${field.enabled ? "border-primary-500 bg-primary-500" : "border-gray-300 dark:border-gray-600"}`}
                    aria-label={field.enabled ? "Disable" : "Enable"}
                  >
                    {field.enabled && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) =>
                      onChangeUrlencodedFields?.(
                        urlencodedFields.map((f, i) =>
                          i === index ? { ...f, key: e.target.value } : f,
                        ),
                      )
                    }
                    placeholder="Key"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      onChangeUrlencodedFields?.(
                        urlencodedFields.map((f, i) =>
                          i === index ? { ...f, value: e.target.value } : f,
                        ),
                      )
                    }
                    placeholder="Value"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() =>
                      onChangeUrlencodedFields?.(
                        urlencodedFields.filter((_, i) => i !== index),
                      )
                    }
                    className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                    aria-label="Remove field"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <td className="px-2 py-1.5">
                <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="text"
                  value={urlencodedNewKey}
                  onChange={(e) => setUrlencodedNewKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlencodedNewKey.trim())
                      urlencodedHandleAddField();
                  }}
                  placeholder="Key"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="text"
                  value={urlencodedNewValue}
                  onChange={(e) => setUrlencodedNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlencodedNewKey.trim())
                      urlencodedHandleAddField();
                  }}
                  placeholder="Value (Enter to add)"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                />
              </td>
              <td className="px-2 py-1.5">
                <button
                  onClick={urlencodedHandleAddField}
                  disabled={!urlencodedNewKey.trim()}
                  className="p-1 text-primary-500 hover:text-primary-600 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Add field"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        {urlencodedFields.length === 0 && (
          <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
            Enter key and value, press Enter to add
          </div>
        )}
      </div>
    </div>
  );

  const renderNoneBody = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Body
        </span>
        <select
          value={bodyType}
          onChange={(e) => onChangeBodyType(e.target.value as BodyType)}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
        >
          {bodyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          This request has no body.
        </p>
      </div>
    </div>
  );

  switch (bodyType) {
    case "json":
      return renderJsonBody();
    case "raw":
      return renderRawBody();
    case "form-data":
      return renderFormDataBody();
    case "urlencoded":
      return renderUrlencodedBody();
    default:
      return renderNoneBody();
  }
}
