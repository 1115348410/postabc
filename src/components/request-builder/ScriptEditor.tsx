import React, { useState } from 'react';

interface ScriptEditorProps {
  script?: string;
  onChange?: (script: string) => void;
  type: 'pre-request' | 'test';
}

export default function ScriptEditor({ script = '', onChange, type }: ScriptEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const title = type === 'pre-request' ? '前置脚本' : '测试脚本';
  const placeholder = type === 'pre-request'
    ? '// 前置脚本在发送请求前执行\n// 可用对象: pm, request, environment, console, utils\n\n// 示例: 动态设置请求头\n// pm.request.headers.add({\n//   key: "Authorization",\n//   value: `Bearer ${environment.token}`\n// });'
    : '// 测试脚本在收到响应后执行\n// 可用对象: pm, response, environment, console, utils\n\n// 示例: 检查状态码\n// pm.test("状态码应为 200", function () {\n//   pm.response.to.have.status(200);\n// });\n\n// 示例: 检查响应体\n// pm.test("响应数据正确", function () {\n//   const jsonData = pm.response.json();\n//   pm.expect(jsonData.success).to.be.true;\n// });';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-white transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
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
          {title}
        </button>
        {script && (
          <span className="text-primary-500 dark:text-primary-400 text-xs">(已添加脚本)</span>
        )}
      </div>

      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-800">
          <textarea
            value={script}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full h-64 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded p-3 focus:outline-none focus:border-primary-500 resize-none"
            spellCheck={false}
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            <p>可用 API:</p>
            <ul className="ml-4 mt-1 space-y-1">
              <li><code className="text-gray-600 dark:text-gray-400">pm.request</code> - 请求对象</li>
              <li><code className="text-gray-600 dark:text-gray-400">pm.response</code> - 响应对象 (仅测试脚本)</li>
              <li><code className="text-gray-600 dark:text-gray-400">pm.environment</code> - 环境变量</li>
              <li><code className="text-gray-600 dark:text-gray-400">pm.test()</code> - 添加测试断言</li>
              <li><code className="text-gray-600 dark:text-gray-400">pm.expect()</code> - 断言辅助函数</li>
              <li><code className="text-gray-600 dark:text-gray-400">utils</code> - 工具函数</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
