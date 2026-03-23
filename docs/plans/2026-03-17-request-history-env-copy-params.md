# PostABC 功能修改实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除请求历史功能，为环境变量 key 添加复制功能（带 {{}} 格式），调整 params 添加位置到已有参数上方

**Architecture:** 修改 DevToolsPanel、ApiTabPanel、EnvironmentManager 和 QueryParamsEditor 四个组件文件

**Tech Stack:** React, TypeScript, TailwindCSS

---

## 任务 1: 移除请求历史功能

**Files:**
- Modify: `src/components/DevToolsPanel.tsx:16` - 移除 HistoryPanel import
- Modify: `src/components/DevToolsPanel.tsx:59` - 移除 showHistory state
- Modify: `src/components/DevToolsPanel.tsx:375-393` - 移除 History button
- Modify: `src/components/DevToolsPanel.tsx:561-565` - 移除 HistoryPanel 组件使用
- Modify: `src/components/DevToolsPanel.tsx:242-243` - 移除 addRequestHistory 调用
- Modify: `src/components/ApiTabPanel.tsx:8` - 移除 HistoryPanel import
- Modify: `src/components/ApiTabPanel.tsx:35` - 移除 showHistory state
- Modify: `src/components/ApiTabPanel.tsx:273` - 移除 History button
- Modify: `src/components/ApiTabPanel.tsx:350-353` - 移除 HistoryPanel 组件使用

**Step 1: 修改 DevToolsPanel.tsx**

```tsx:16
// 删除这一行:
import HistoryPanel from './HistoryPanel';
```

```tsx:59
// 删除 showHistory state:
const [showHistory, setShowHistory] = useState(false);
```

```tsx:375-393
// 删除 History button:
<button
  onClick={() => setShowHistory(true)}
  className="p-2 text-gray-400 hover:text-white transition-colors"
  title="History"
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
</button>
```

```tsx:561-565
// 删除 HistoryPanel 组件:
<HistoryPanel
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
  onSelectRequest={handleSelectRequestFromHistory}
/>
```

```tsx:242-243
// 删除保存到历史记录:
// await storageAPI.addRequestHistory(request, result.success ? result.data : undefined);
```

**Step 2: 修改 ApiTabPanel.tsx**

```tsx:8
// 删除这一行:
import HistoryPanel from './HistoryPanel';
```

```tsx:35
// 删除 showHistory state:
const [showHistory, setShowHistory] = useState(false);
```

```tsx:273
// 删除 History button:
<button
  onClick={() => setShowHistory(true)}
  ...
</button>
```

```tsx:350-353
// 删除 HistoryPanel 组件:
<HistoryPanel
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
/>
```

**Step 3: 验证构建**

运行: `npm run build` 或 `npx wxt build`
Expected: 构建成功，无错误

---

## 任务 2: 环境变量 key 添加复制功能

**Files:**
- Modify: `src/components/EnvironmentManager.tsx:480-486` - 在 key input 后添加复制按钮

**Step 1: 添加复制函数**

在 EnvironmentManager.tsx 中，handleAddVariable 函数后添加:

```tsx
const handleCopyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(`{{${key}}}`);
    // 可选：显示 toast 提示
    console.log('已复制:', `{{${key}}}`);
  } catch (err) {
    console.error('复制失败:', err);
  }
};
```

**Step 2: 在 key input 后添加复制按钮**

在变量列表渲染中，找到 key input (约 480-486 行)，在 </input> 后添加:

```tsx:490-510
<button
  onClick={() => handleCopyKey(displayInfo.key)}
  className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
  title={`复制 {{${displayInfo.key}}}`}
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
</button>
```

**Step 3: 验证构建**

运行: `npm run build`
Expected: 构建成功

---

## 任务 3: Params 区域新增固定在已设置参数上面

**Files:**
- Modify: `src/components/request-builder/QueryParamsEditor.tsx:60-65` - 将 "No query parameters yet" 移到添加按钮下方
- Modify: `src/components/request-builder/QueryParamsEditor.tsx:142-177` - 将添加输入框移到参数列表前面

**Step 1: 修改 QueryParamsEditor.tsx 结构**

将添加新参数的 div (142-177 行) 移到 params.length === 0 判断之前，并调整结构:

```tsx:60-65
// 修改后:
<div className="flex-1 overflow-auto p-4">
  {/* 添加新参数 - 始终显示在顶部 */}
  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAddParam();
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
            handleAddParam();
          }
        }}
        placeholder="Value"
        className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
      />
      <button
        onClick={handleAddParam}
        disabled={!newKey.trim()}
        className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
      >
        Add
      </button>
    </div>
  </div>

  {/* 参数列表或空状态 */}
  {params.length === 0 ? (
    <div className="text-center py-8">
      <p className="text-gray-400 dark:text-gray-500 text-sm">No query parameters yet</p>
    </div>
  ) : (
    <div className="space-y-2">
      {params.map((param, index) => (
        // ... existing param rendering code
      ))}
    </div>
  )}

  {/* 删除旧的添加新参数 div (原 142-177 行) */}
</div>
```

**Step 2: 验证构建**

运行: `npm run build`
Expected: 构建成功

---

## 执行验证

所有任务完成后，运行以下命令验证:

```bash
npm run build
# Expected: 构建成功，无错误
```

如果需要测试 UI:
```bash
npm run dev
# 或
npx wxt dev
```
