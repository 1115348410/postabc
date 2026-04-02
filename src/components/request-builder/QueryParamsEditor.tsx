import React, { useState } from "react";
import type { QueryParam } from "../../types";

interface QueryParamsEditorProps {
  params: QueryParam[];
  onChange: (params: QueryParam[]) => void;
}

export default function QueryParamsEditor({
  params,
  onChange,
}: QueryParamsEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAddParam = () => {
    if (!newKey.trim()) {
      return;
    }

    const newParam: QueryParam = {
      key: newKey.trim(),
      value: newValue.trim(),
      enabled: true,
    };

    onChange([...params, newParam]);
    setNewKey("");
    setNewValue("");
  };

  const handleRemoveParam = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  const handleToggleParam = (index: number) => {
    onChange(
      params.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  const handleUpdateKey = (index: number, key: string) => {
    onChange(params.map((p, i) => (i === index ? { ...p, key } : p)));
  };

  const handleUpdateValue = (index: number, value: string) => {
    onChange(params.map((p, i) => (i === index ? { ...p, value } : p)));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Query Params
        </span>
        <span className="text-gray-400 dark:text-gray-600 text-xs">
          {params.filter((p) => p.enabled).length} active
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Params table */}
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
            {params.map((param, index) => (
              <tr
                key={index}
                className={`border-b border-gray-100 dark:border-gray-800 ${
                  param.enabled ? "" : "opacity-50"
                }`}
              >
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => handleToggleParam(index)}
                    className={`w-5 h-5 flex items-center justify-center rounded border ${
                      param.enabled
                        ? "border-primary-500 bg-primary-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    aria-label={param.enabled ? "Disable" : "Enable"}
                  >
                    {param.enabled && (
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
                    value={param.key}
                    onChange={(e) => handleUpdateKey(index, e.target.value)}
                    placeholder="Key"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => handleUpdateValue(index, e.target.value)}
                    placeholder="Value"
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => handleRemoveParam(index)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                    aria-label="Remove parameter"
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
            {/* Add new row */}
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
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newKey.trim()) {
                      handleAddParam();
                    }
                  }}
                  placeholder="Key"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newKey.trim()) {
                      handleAddParam();
                    }
                  }}
                  placeholder="Value (Enter to add)"
                  className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                />
              </td>
              <td className="px-2 py-1.5">
                <button
                  onClick={handleAddParam}
                  disabled={!newKey.trim()}
                  className="p-1 text-primary-500 hover:text-primary-600 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Add parameter"
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
        {params.length === 0 && (
          <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
            Enter key and value, press Enter to add
          </div>
        )}
      </div>
    </div>
  );
}
