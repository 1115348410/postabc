import React, { useState, useMemo } from 'react';
import type { BodyType, FormDataField, QueryParam } from '../../types';

interface JsonValidationResult {
  isValid: boolean;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

function validateJson(json: string): JsonValidationResult {
  if (!json.trim()) {
    return { isValid: true }; // Empty is valid
  }

  try {
    JSON.parse(json);
    return { isValid: true };
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Try to extract line and column from error message
      const match = e.message.match(/position\s+(\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = json.substring(0, position).split('\n');
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
  jsonBody = '',
  onChangeJsonBody,
  rawBody = '',
  onChangeRawBody,
  formDataFields = [],
  onChangeFormDataFields,
  urlencodedFields = [],
  onChangeUrlencodedFields,
}: BodyEditorProps) {
  const bodyTypes: { value: BodyType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'form-data', label: 'Form Data' },
    { value: 'urlencoded', label: 'URL Encoded' },
    { value: 'raw', label: 'Raw' },
  ];

  // JSON body editor
  if (bodyType === 'json') {
    const jsonValidation = useMemo(() => validateJson(jsonBody), [jsonBody]);

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Body</span>
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
            {/* JSON 验证状态指示器 */}
            {jsonBody.trim() && (
              <div className="flex items-center gap-1.5">
                {jsonValidation.isValid ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-500">Valid JSON</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-red-500">Invalid JSON</span>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => {
                try {
                  const formatted = JSON.stringify(
                    JSON.parse(jsonBody),
                    null,
                    2,
                  );
                  onChangeJsonBody?.(formatted);
                } catch (e) {
                  // Invalid JSON, ignore - 用户已通过验证提示知道问题
                }
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
            placeholder='{\n  "key": "value"\n}'
            className={`w-full flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base font-mono border rounded p-3 focus:outline-none resize-none ${
              jsonBody.trim() && !jsonValidation.isValid
                ? 'border-red-400 dark:border-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-700 focus:border-primary-500'
            }`}
            spellCheck={false}
          />
          {/* 错误详情提示 */}
          {jsonBody.trim() && !jsonValidation.isValid && jsonValidation.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">JSON Error: </span>
                {jsonValidation.errorLine && jsonValidation.errorColumn ? (
                  <span>
                    Line {jsonValidation.errorLine}, Column {jsonValidation.errorColumn}: {jsonValidation.error}
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
  }

  // Raw body editor
  if (bodyType === 'raw') {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Body</span>
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
  }

  // Form Data editor
  if (bodyType === 'form-data') {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const handleAddField = () => {
      if (!newKey.trim()) {
        return;
      }

      onChangeFormDataFields?.([
        ...formDataFields,
        { key: newKey.trim(), value: newValue.trim(), type: 'text', enabled: true },
      ]);
      setNewKey('');
      setNewValue('');
    };

    const handleRemoveField = (index: number) => {
      onChangeFormDataFields?.(formDataFields.filter((_, i) => i !== index));
    };

    const handleToggleField = (index: number) => {
      onChangeFormDataFields?.(
        formDataFields.map((f, i) =>
          i === index ? { ...f, enabled: !f.enabled } : f,
        ),
      );
    };

    const handleUpdateKey = (index: number, key: string) => {
      onChangeFormDataFields?.(
        formDataFields.map((f, i) => (i === index ? { ...f, key } : f)),
      );
    };

    const handleUpdateValue = (index: number, value: string) => {
      onChangeFormDataFields?.(
        formDataFields.map((f, i) => (i === index ? { ...f, value } : f)),
      );
    };

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Body</span>
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
          {formDataFields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No form data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formDataFields.map((field, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    field.enabled
                      ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => handleToggleField(index)}
                    className={`w-5 h-5 flex items-center justify-center rounded border ${
                      field.enabled
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-label={field.enabled ? 'Disable' : 'Enable'}
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

                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => handleUpdateKey(index, e.target.value)}
                    placeholder="Key"
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />

                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleUpdateValue(index, e.target.value)}
                    placeholder="Value"
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />

                  <button
                    onClick={() => handleRemoveField(index)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
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
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddField();
                  }
                }}
                placeholder="Key"
                className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddField();
                  }
                }}
                placeholder="Value"
                className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddField}
                disabled={!newKey.trim()}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // URL Encoded editor (same as form-data but with different data structure)
  if (bodyType === 'urlencoded') {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const handleAddField = () => {
      if (!newKey.trim()) {
        return;
      }

      onChangeUrlencodedFields?.([
        ...urlencodedFields,
        { key: newKey.trim(), value: newValue.trim(), enabled: true },
      ]);
      setNewKey('');
      setNewValue('');
    };

    const handleRemoveField = (index: number) => {
      onChangeUrlencodedFields?.(urlencodedFields.filter((_, i) => i !== index));
    };

    const handleToggleField = (index: number) => {
      onChangeUrlencodedFields?.(
        urlencodedFields.map((f, i) =>
          i === index ? { ...f, enabled: !f.enabled } : f,
        ),
      );
    };

    const handleUpdateKey = (index: number, key: string) => {
      onChangeUrlencodedFields?.(
        urlencodedFields.map((f, i) => (i === index ? { ...f, key } : f)),
      );
    };

    const handleUpdateValue = (index: number, value: string) => {
      onChangeUrlencodedFields?.(
        urlencodedFields.map((f, i) => (i === index ? { ...f, value } : f)),
      );
    };

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Body</span>
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
          {urlencodedFields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No URL encoded data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urlencodedFields.map((field, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    field.enabled
                      ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => handleToggleField(index)}
                    className={`w-5 h-5 flex items-center justify-center rounded border ${
                      field.enabled
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-label={field.enabled ? 'Disable' : 'Enable'}
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

                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => handleUpdateKey(index, e.target.value)}
                    placeholder="Key"
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />

                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleUpdateValue(index, e.target.value)}
                    placeholder="Value"
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />

                  <button
                    onClick={() => handleRemoveField(index)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
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
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddField();
                  }
                }}
                placeholder="Key"
                className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddField();
                  }
                }}
                placeholder="Value"
                className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddField}
                disabled={!newKey.trim()}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // None body type
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Body</span>
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
        <p className="text-gray-400 dark:text-gray-500 text-sm">This request has no body.</p>
      </div>
    </div>
  );
}
