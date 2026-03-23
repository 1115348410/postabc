import React, { useState, useEffect, useCallback, memo } from 'react';
import { useDevToolsStore } from '../stores';
import type { RequestConfig, StreamConfig } from '../types';
import RequestEditor from './RequestEditor';
import RequestTabBar from './RequestTabBar';
import Sidebar from './Sidebar';
import EnvironmentManager from './EnvironmentManager';
import SaveRequestDialog from './SaveRequestDialog';
import ResponsePanel from './response-viewer/ResponsePanel';
import BuiltinVariablesDrawer from './BuiltinVariablesDrawer';
import { saveEnvironmentVariables } from '../services/environment-service';
import { apiClient } from '../services/api-client';

type Theme = 'light' | 'dark' | 'system';

// 默认流式配置
const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enabled: false,
  extractionRules: [],
  displayMode: 'concatenated',
};

// 主题切换按钮组件 - 独立管理主题状态，避免触发父组件重新渲染
const ThemeToggleButton = memo(function ThemeToggleButton() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // 加载保存的主题
    const saved = localStorage.getItem('postabc-theme');
    if (saved) {
      setTheme(saved as Theme);
      applyTheme(saved as Theme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const isDark = newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('postabc-theme', newTheme);
    setTheme(newTheme);
  };

  return (
    <button
      onClick={handleThemeChange}
      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
});

export default function ApiTabPanel() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, updateTab, getActiveTab } = useDevToolsStore();

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);

  // Modal states
  const [showEnvironmentManager, setShowEnvironmentManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showBuiltinVariables, setShowBuiltinVariables] = useState(false);
  const [streamConfig, setStreamConfig] = useState<StreamConfig>(DEFAULT_STREAM_CONFIG);

  const activeTab = getActiveTab();

  useEffect(() => {
    // 如果有tab但没有activeTabId，设置第一个为active
    if (!activeTabId && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, []);

  // 加载环境变量（在服务器配置成功后调用）
  const loadEnvironmentVariables = useCallback(async () => {
    try {
      // 从服务器 API 获取最新的环境变量
      const serverEnv = await apiClient.getEnvVariables();
      if (serverEnv && serverEnv.length > 0) {
        // 转换为 environment-service 格式 (envKey/envValue)
        const envVars = serverEnv.map(v => ({
          id: v.id,
          envKey: v.envKey,
          envValue: v.envValue
        }));
        // 保存到本地缓存 (chrome.storage.local)
        await saveEnvironmentVariables(envVars);
        console.log('[PostABC] 环境变量已从服务器缓存到本地:', serverEnv.length);
      }
    } catch (error) {
      console.error('[PostABC] 加载环境变量失败:', error);
    }
  }, []);

  // 侧边栏拖拽调整宽度
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleAddTab = () => {
    addTab();
  };

  const handleCloseTab = (tabId: string) => {
    closeTab(tabId);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabRename = async (tabId: string, newName: string) => {
    const tab = tabs.find(t => t.id === tabId);
    updateTab(tabId, { name: newName });
    
    // 如果是已保存的接口，同步更新到服务端
    if (tab?.apiUuid) {
      try {
        await apiClient.updateApiName(tab.apiUuid, newName);
        setSidebarKey((k) => k + 1); // 刷新侧边栏
      } catch (error) {
        console.error('[PostABC] 更新接口名称失败:', error);
        // 回滚本地更新
        updateTab(tabId, { name: tab.name });
        alert('更新名称失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  const handleSelectRequest = useCallback((request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => {
    // 使用 getActiveTab 获取最新的 tabs 状态
    const currentTabs = useDevToolsStore.getState().tabs;
    
    // 如果是已保存的接口(有apiUuid)，检查是否已在tab中打开
    if (apiUuid) {
      const existingTab = currentTabs.find(tab => tab.apiUuid === apiUuid);
      if (existingTab) {
        // 切换到已打开的tab
        setActiveTab(existingTab.id);
        return;
      }
    }
    
    // Load request into active tab or create new tab
    const tabName = name || (request.url ? new URL(request.url).pathname.split('/').pop() || '接口' : '接口');
    const currentActiveTab = getActiveTab();
    if (currentActiveTab) {
      updateTab(currentActiveTab.id, {
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
  }, [setActiveTab, updateTab, addTab, getActiveTab]);

  const handleOpenInNewTab = useCallback((request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => {
    // 使用 getActiveTab 获取最新的 tabs 状态
    const currentTabs = useDevToolsStore.getState().tabs;
    
    // 如果是已保存的接口(有apiUuid)，检查是否已在tab中打开
    if (apiUuid) {
      const existingTab = currentTabs.find(tab => tab.apiUuid === apiUuid);
      if (existingTab) {
        // 切换到已打开的tab，不创建新tab
        setActiveTab(existingTab.id);
        return;
      }
    }
    
    // 如果不存在，创建新tab
    const tabName = name || (request.url ? new URL(request.url).pathname.split('/').pop() || '接口' : '接口');
    addTab({
      request,
      name: tabName,
      isModified: false,
      apiUuid,
      parentUuid
    });
  }, [setActiveTab, addTab]);

  const handleSaveSuccess = (apiUuid?: string, parentUuid?: string, name?: string) => {
    setSidebarKey((k) => k + 1);
    // 更新当前 tab 的 apiUuid、parentUuid 和 name
    if (activeTab && apiUuid) {
      updateTab(activeTab.id, { 
        apiUuid, 
        parentUuid,
        ...(name && { name }),
        isModified: false
      });
    }
  };

  const getCurrentRequest = (): RequestConfig => {
    return activeTab?.request || {
      method: 'GET',
      url: '',
      headers: [],
      queryParams: [],
      bodyType: 'none',
    };
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">PostABC API 调试工具</h1>
        <div className="flex items-center gap-2">
          {/* 主题切换 */}
          <ThemeToggleButton />
          {/* 变量说明 */}
          <button
            onClick={() => setShowBuiltinVariables(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            title="变量说明"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowEnvironmentManager(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            title="全局变量"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <RequestTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleCloseTab}
        onTabRename={handleTabRename}
        onAddTab={handleAddTab}
      />

      {/* 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧栏 - 接口列表 */}
        <div style={{ width: sidebarWidth }} className="flex-shrink-0">
          <Sidebar
            key={sidebarKey}
            onSelectRequest={handleSelectRequest}
            onOpenInNewTab={handleOpenInNewTab}
            onSaveRequest={() => setShowSaveDialog(true)}
            onRefresh={loadEnvironmentVariables}
          />
        </div>

        {/* 拖拽分隔线 */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-primary-500 cursor-col-resize transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* 中间栏 - 请求构建区 */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {activeTab ? (
            <RequestEditor
              key={activeTab.id}
              tabId={activeTab.id}
              initialRequest={activeTab.request}
              onSave={() => setShowSaveDialog(true)}
              apiUuid={activeTab.apiUuid}
              parentUuid={activeTab.parentUuid}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <p>点击 + 按钮新建接口</p>
            </div>
          )}
        </div>

        {/* 右侧栏 - 响应查看区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
          <ResponsePanel 
            streamConfig={activeTab?.request?.streamConfig}
            onStreamConfigChange={(config) => {
              if (activeTab) {
                const updatedRequest = { ...activeTab.request, streamConfig: config };
                updateTab(activeTab.id, { request: updatedRequest });
              }
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <EnvironmentManager
        isOpen={showEnvironmentManager}
        onClose={() => setShowEnvironmentManager(false)}
      />
      <SaveRequestDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        request={getCurrentRequest()}
        onSaveSuccess={handleSaveSuccess}
        apiUuid={activeTab?.apiUuid}
        parentUuid={activeTab?.parentUuid}
        apiName={activeTab?.name}
      />
      <BuiltinVariablesDrawer
        isOpen={showBuiltinVariables}
        onClose={() => setShowBuiltinVariables(false)}
      />
    </div>
  );
}
