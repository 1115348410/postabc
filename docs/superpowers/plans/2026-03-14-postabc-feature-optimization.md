# PostABC 功能优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现4个功能优化：1)新建接口+号按钮和保存/更新逻辑 2)Stream栏预设格式优化 3)避免重复打开同一接口 4)环境变量缓存

**Architecture:** 修改现有组件和服务的逻辑，在客户端实现状态管理和缓存优化

**Tech Stack:** React, TypeScript, Zustand, chrome.storage.local

---

### Task 1: 修改新建接口按钮和发送按钮逻辑

**Files:**
- Modify: `src/components/RequestEditor.tsx:313-377`
- Modify: `src/components/RequestEditor.tsx:126-259`

**Step 1: 修改发送按钮为+号图标**

将 RequestEditor.tsx 中 URL Bar 的发送按钮从文字"发送"改为+号图标，并分离"发送"和"保存/更新"功能：

```tsx
// 在 RequestEditor.tsx 第353-376行替换按钮逻辑
{isSending ? (
  <button
    onClick={handleCancelRequest}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
  >
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    取消
  </button>
) : (
  <div className="flex items-center gap-2">
    {/* 新建接口按钮 - 显示为+号 */}
    <button
      onClick={handleNewRequest}
      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded font-medium transition-colors"
      title="新建接口"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
    
    {/* 发送按钮 */}
    <button
      onClick={handleSendRequest}
      disabled={!url.trim()}
      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors"
    >
      发送
    </button>
    
    {/* 保存/更新按钮 - 根据apiUuid判断 */}
    {onSave && (
      <button
        onClick={handleSaveOrUpdate}
        disabled={!url.trim()}
        className={`${apiUuid ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-1`}
        title={apiUuid ? '更新接口' : '保存为新接口'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        {apiUuid ? '更新' : '保存'}
      </button>
    )}
  </div>
)}
```

**Step 2: 添加新建接口处理函数**

在 RequestEditor.tsx 中添加 handleNewRequest 函数：

```tsx
const handleNewRequest = useCallback(() => {
  // 清空当前编辑器的输入内容，创建新Tab
  setMethod('GET');
  setUrl('');
  setHeaders(getDefaultHeaders());
  setQueryParams([{ key: '', value: '', enabled: true }]);
  setBodyType('none');
  setJsonBody('');
  setRawBody('');
  setFormDataFields([{ key: '', value: '', type: 'text', enabled: true }]);
  setUrlencodedFields([{ key: '', value: '', enabled: true }]);
  setPreRequestScript('');
  setTestScript('');
  setStreamConfig(DEFAULT_STREAM_CONFIG);
  
  // 通知父组件创建新Tab
  if (onNewRequest) {
    onNewRequest();
  }
}, [onNewRequest]);
```

**Step 3: 添加保存/更新处理函数**

添加 handleSaveOrUpdate 函数：

```tsx
const handleSaveOrUpdate = useCallback(() => {
  if (apiUuid) {
    // 已保存接口 - 直接更新，无需弹窗
    handleUpdateRequest();
  } else {
    // 新接口 - 打开保存对话框
    onSave?.();
  }
}, [apiUuid, onSave]);
```

**Step 4: 添加 handleUpdateRequest 函数**

```tsx
const handleUpdateRequest = useCallback(async () => {
  if (!apiUuid || !url.trim()) return;
  
  setIsSending(true);
  try {
    const request = getCurrentRequest();
    
    // 调用更新API
    await apiClient.updateApi(apiUuid, {
      method: request.method,
      url: request.url,
      params: JSON.stringify(request.queryParams?.reduce((acc, p) => {
        if (p.enabled && p.key) acc[p.key] = p.value;
        return acc;
      }, {} as Record<string, string>)),
      headers: JSON.stringify(request.headers?.reduce((acc, h) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {} as Record<string, string>)),
      bodyType: request.bodyType || 'json',
      bodyContent: request.body?.json || request.body?.raw || '{}',
      preScript: '',
      testScript: '',
      sseFlag: false,
      ssePaths: '{}'
    });
    
    alert('接口更新成功');
  } catch (error) {
    console.error('[PostABC] 更新接口失败:', error);
    alert('更新失败: ' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    setIsSending(false);
  }
}, [apiUuid, url]);
```

**Step 5: 在 ApiTabPanel.tsx 添加 onNewRequest 属性传递**

修改 ApiTabPanel.tsx 中 RequestEditor 的调用：

```tsx
<RequestEditor
  key={activeTab.id}
  tabId={activeTab.id}
  initialRequest={activeTab.request}
  onSave={() => setShowSaveDialog(true)}
  onNewRequest={handleNewRequest}
  apiUuid={activeTab.apiUuid}
  parentUuid={activeTab.parentUuid}
/>
```

并在 ApiTabPanel.tsx 中添加 handleNewRequest：

```tsx
const handleNewRequest = () => {
  addTab({ name: '新增API请求' });
};
```

---

### Task 2: Stream栏预设格式优化

**Files:**
- Modify: `src/components/request-builder/StreamConfigEditor.tsx:1-303`

**Step 1: 添加"其他"预设选项**

修改 PRESETS 对象添加其他选项：

```tsx
const PRESETS = {
  openai: {
    name: 'OpenAI 格式',
    rules: [
      { path: 'choices[0].delta.content', alias: 'content', concatenate: true },
      { path: 'choices[0].finish_reason', alias: 'finish_reason', concatenate: false },
    ],
  },
  anthropic: {
    name: 'Anthropic 格式',
    rules: [
      { path: 'content', alias: 'content', concatenate: true },
      { path: 'type', alias: 'type', concatenate: false },
    ],
  },
  custom: {
    name: '其他',
    rules: [],
  },
};
```

**Step 2: 更新 handleLoadPreset 函数**

```tsx
const handleLoadPreset = (preset: 'openai' | 'anthropic' | 'custom') => {
  const presetConfig = PRESETS[preset];
  onChange({
    ...config,
    enabled: preset !== 'custom',
    extractionRules: preset === 'custom' ? [] : presetConfig.rules.map(r => ({ ...r })),
  });
};
```

**Step 3: 移除显示模式部分**

删除第160-186行的显示模式代码块：

```tsx
// 删除这部分代码
{/* 显示模式 */}
<div>
  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
    显示模式
  </label>
  <div className="flex gap-2">
    {/* ... */}
  </div>
</div>
```

**Step 4: 移除拼接内容勾选框**

修改第247-257行的拼接内容部分，改为始终默认拼接：

```tsx
// 移除checkbox，始终默认拼接
<div className="text-xs text-gray-500 dark:text-gray-500">
  内容将自动拼接
</div>
```

同时更新 DEFAULT_RULE：

```tsx
const DEFAULT_RULE: StreamExtractionRule = {
  path: '',
  alias: '',
  concatenate: true,  // 默认始终为 true
};
```

**Step 5: 更新预设按钮显示**

修改预设选择按钮，添加"其他"按钮：

```tsx
<div className="flex gap-2">
  <button
    onClick={() => handleLoadPreset('openai')}
    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
      currentPreset === 'openai'
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400'
    }`}
  >
    OpenAI 格式
  </button>
  <button
    onClick={() => handleLoadPreset('anthropic')}
    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
      currentPreset === 'anthropic'
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400'
    }`}
  >
    Anthropic 格式
  </button>
  <button
    onClick={() => handleLoadPreset('custom')}
    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
      currentPreset === 'custom' || !currentPreset
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400'
    }`}
  >
    其他
  </button>
</div>
```

---

### Task 3: 避免重复打开同一接口

**Files:**
- Modify: `src/components/ApiTabPanel.tsx:117-148`
- Modify: `src/stores/index.ts:182-191`

**Step 1: 修改 ApiTabPanel 中的 handleSelectRequest 函数**

检查 apiUuid 是否已经在 tabs 中打开，如果是则切换到该 tab：

```tsx
const handleSelectRequest = (request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => {
  // 如果是已保存的接口(有apiUuid)，检查是否已在tab中打开
  if (apiUuid) {
    const existingTab = tabs.find(tab => tab.apiUuid === apiUuid);
    if (existingTab) {
      // 切换到已打开的tab
      setActiveTab(existingTab.id);
      return;
    }
  }
  
  // Load request into active tab or create new tab
  const tabName = name || (request.url ? new URL(request.url).pathname.split('/').pop() || '接口' : '接口');
  if (activeTab) {
    updateTab(activeTab.id, {
      request,
      name: tabName,
      isModified: false,
      apiUuid,
      parentUuid
    });
  } else {
    addTab({
      request,
      name: tabName,
      apiUuid,
      parentUuid
    });
  }
};
```

**Step 2: 修改 handleOpenInNewTab 函数**

同样添加检查逻辑，但强制打开新tab：

```tsx
const handleOpenInNewTab = (request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => {
  // Always create a new tab (右键菜单或Ctrl+点击时使用)
  const tabName = name || (request.url ? new URL(request.url).pathname.split('/').pop() || '接口' : '接口');
  addTab({
    request,
    name: tabName,
    isModified: false,
    apiUuid,
    parentUuid
  });
};
```

---

### Task 4: 插件初始化时缓存环境变量

**Files:**
- Modify: `src/components/ApiTabPanel.tsx:1-50`
- Modify: `src/components/EnvironmentManager.tsx`
- Modify: `src/services/environment-service.ts`

**Step 1: 在 ApiTabPanel 初始化时加载环境变量**

在 ApiTabPanel.tsx 中添加初始化逻辑：

```tsx
import { getEnvironmentVariablesMap, saveEnvironmentVariables } from '../services/environment-service';
import { storageAPI } from '../storage/indexed-db';

// 在组件中添加
const [envLoaded, setEnvLoaded] = useState(false);

useEffect(() => {
  // 初始化时异步加载环境变量
  const initEnvironment = async () => {
    try {
      // 尝试从服务端获取最新的环境变量
      const serverEnv = await storageAPI.getEnvironmentVariables();
      if (serverEnv && serverEnv.length > 0) {
        // 保存到本地缓存
        await saveEnvironmentVariables(serverEnv);
        console.log('[PostABC] 环境变量已缓存到本地:', serverEnv.length);
      }
      setEnvLoaded(true);
    } catch (error) {
      console.error('[PostABC] 加载环境变量失败:', error);
      setEnvLoaded(true); // 即使失败也继续
    }
  };
  
  initEnvironment();
}, []);
```

**Step 2: 修改 EnvironmentManager 保存后同步缓存**

在 EnvironmentManager.tsx 中，保存变量后立即更新本地缓存：

```tsx
// 添加保存后的回调
const handleSave = async (variables: EnvironmentVariable[]) => {
  try {
    await storageAPI.saveEnvironmentVariables(variables);
    // 同时更新 chrome.storage.local 缓存
    await saveEnvironmentVariables(variables);
    onClose?.();
  } catch (error) {
    console.error('[PostABC] 保存环境变量失败:', error);
  }
};
```

**Step 3: 确保 RequestEditor 中正确使用缓存的环境变量**

修改 RequestEditor.tsx 中的发送逻辑，确保每次发送都使用最新缓存：

```tsx
const handleSendRequest = useCallback(async () => {
  if (!url.trim()) {
    alert('请填写请求 URL');
    return;
  }

  // 优先从本地缓存获取环境变量（已初始化时缓存）
  let latestEnv = await getEnvironmentVariablesMap();
  
  // 如果缓存为空，尝试从服务端获取
  if (Object.keys(latestEnv).length === 0) {
    try {
      const serverEnv = await storageAPI.getEnvironmentVariables();
      if (serverEnv && serverEnv.length > 0) {
        await saveEnvironmentVariables(serverEnv);
        latestEnv = serverEnv.reduce((acc, v) => {
          acc[v.envKey] = v.envValue;
          return acc;
        }, {} as Record<string, string>);
      }
    } catch (e) {
      console.warn('[PostABC] 获取环境变量失败，使用空值');
    }
  }
  
  console.log('[RequestEditor] 发送请求时的环境变量:', latestEnv);
  setEnvironment(latestEnv);
  
  // ... 其余逻辑保持不变
}, [...dependencies]);
```

---

### 验证步骤

**Task 1 验证:**
1. 运行 `npm run dev` 启动开发服务器
2. 点击+号按钮应该创建新Tab并清空输入
3. 点击"发送"按钮应该正常发送请求
4. 新的未保存接口点击"保存"应该弹出 SaveRequestDialog
5. 已保存接口（apiUuid存在）点击"更新"应该直接更新，无弹窗

**Task 2 验证:**
1. 打开 Stream 配置
2. 确认有 OpenAI/Anthropic/其他 三个预设选项
3. 确认"显示模式"已移除
4. 确认"拼接内容"勾选框已移除，规则默认自动拼接

**Task 3 验证:**
1. 点击左侧栏的某个已保存接口
2. 再次点击同一个接口，应该切换到已打开的tab而不是创建新tab
3. tab应该高亮显示

**Task 4 验证:**
1. 打开插件时检查控制台日志
2. 确认显示"环境变量已缓存到本地"
3. 发送带 {{变量KEY}} 的请求，应该能正确替换

---

### 预期结果

完成所有任务后：
- 新建接口使用+号按钮，已保存接口使用更新按钮
- Stream配置更简洁
- 避免重复打开同一接口的tab
- 环境变量在初始化时自动缓存
