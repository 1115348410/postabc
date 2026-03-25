import { useState, useEffect, useCallback } from 'react';
import { apiClient, type ApiInfoDTO } from '../services/api-client';
import { getHttpMethodColor } from '../constants/http-methods';
import type { RequestConfig } from '../types';
import ServerConfigModal from './ServerConfigModal';

interface SidebarProps {
  onSelectRequest: (request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => void;
  onOpenInNewTab?: (request: RequestConfig, name?: string, apiUuid?: string, parentUuid?: string) => void;
  onSaveRequest?: () => void;
  onRefresh?: () => void;
}

// 从 chrome.storage 获取服务器配置
const getServerBaseUrl = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['postabc_server_config'], (result) => {
        resolve(result.postabc_server_config?.baseUrl || null);
      });
    } else {
      const stored = localStorage.getItem('postabc_server_config');
      if (stored) {
        resolve(JSON.parse(stored).baseUrl);
      } else {
        resolve(null);
      }
    }
  });
};

export default function Sidebar({ onSelectRequest, onOpenInNewTab, onSaveRequest, onRefresh }: SidebarProps) {
  const [items, setItems] = useState<ApiInfoDTO[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadedFolders, setLoadedFolders] = useState<Set<string>>(new Set()); // 追踪已加载的文件夹
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderUuid, setParentFolderUuid] = useState<string | undefined>(undefined);
  const [editingFolderUuid, setEditingFolderUuid] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 检查是否配置了服务端地址
      const baseUrl = await getServerBaseUrl();
      if (!baseUrl) {
        setError('未配置服务端地址');
        setShowServerConfig(true);
        return;
      }

      const data = await apiClient.listDirectory();

      // 对每个非文件夹的API获取method
      const itemsWithMethod = await Promise.all(
        data.map(async (item) => {
          if (!apiClient.isFolder(item)) {
            try {
              const detail = await apiClient.getApiDetail(item.uuid);
              return { ...item, method: detail.method };
            } catch (e) {
              console.warn(`获取API method失败: ${item.name}`, e);
              return item;
            }
          }
          return item;
        })
      );

      setItems(itemsWithMethod);
      // 加载成功后，触发环境变量加载
      onRefresh?.();
    } catch (err) {
      console.error('[PostABC] 加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFolder = async (folderId: string) => {
    const isCurrentlyExpanded = expandedFolders.has(folderId);

    // 如果是展开操作且该文件夹尚未加载过，则请求后端获取数据
    if (!isCurrentlyExpanded && !loadedFolders.has(folderId)) {
      try {
        setIsLoading(true);
        const folderItems = await apiClient.listDirectory(folderId);

        // 对每个非文件夹的API获取method
        const folderItemsWithMethod = await Promise.all(
          folderItems.map(async (item) => {
            if (!apiClient.isFolder(item)) {
              try {
                const detail = await apiClient.getApiDetail(item.uuid);
                return { ...item, method: detail.method };
              } catch (e) {
                console.warn(`获取API method失败: ${item.name}`, e);
                return item;
              }
            }
            return item;
          })
        );

        // 合并新数据到现有items中
        setItems((prevItems) => {
          // 移除旧的该文件夹下的子项（如果有）
          const filteredItems = prevItems.filter(item => item.parentUuid !== folderId);
          // 添加新的子项
          return [...filteredItems, ...folderItemsWithMethod];
        });

        // 标记该文件夹为已加载
        setLoadedFolders((prev) => new Set(prev).add(folderId));
      } catch (err) {
        console.error('[PostABC] 加载文件夹内容失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
        return; // 加载失败时不展开
      } finally {
        setIsLoading(false);
      }
    }
    
    // 更新展开/收起状态
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      // v2: createFolder(name, parentUuid)
      await apiClient.createFolder(newFolderName.trim(), parentFolderUuid);
      setNewFolderName('');
      setShowNewFolderInput(false);
      setParentFolderUuid(undefined);
      loadData();
    } catch (error) {
      console.error('[PostABC] 创建文件夹失败:', error);
      alert('创建文件夹失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolderUuid || !editingFolderName.trim()) return;

    try {
      await apiClient.updateFolder(editingFolderUuid, editingFolderName.trim());
      setEditingFolderUuid(null);
      setEditingFolderName('');
      loadData();
    } catch (error) {
      console.error('[PostABC] 重命名文件夹失败:', error);
      alert('重命名失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteItem = async (uuid: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;

    try {
      await apiClient.deleteItem(uuid);
      loadData();
    } catch (error) {
      console.error('[PostABC] 删除失败:', error);
      alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleSelectApi = async (api: ApiInfoDTO) => {
    try {
      // v2: getApiDetail 返回 ApiInfoItemDTO
      const detail = await apiClient.getApiDetail(api.uuid);

      // 解析请求体内容 - 根据 bodyType 解析
      let body: RequestConfig['body'] = undefined;
      try {
        if (detail.bodyContent && detail.bodyType) {
          switch (detail.bodyType) {
            case 'json':
              body = { json: detail.bodyContent };
              break;
            case 'raw':
              body = { raw: detail.bodyContent };
              break;
            case 'form-data':
              try {
                const formData = JSON.parse(detail.bodyContent);
                body = { form: Array.isArray(formData) ? formData : [] };
              } catch (e) {
                console.warn('解析form-data失败:', e);
                body = { form: [] };
              }
              break;
            case 'urlencoded':
              try {
                const urlencodedData = JSON.parse(detail.bodyContent);
                body = { urlencoded: Array.isArray(urlencodedData) ? urlencodedData : [] };
              } catch (e) {
                console.warn('解析urlencoded失败:', e);
                body = { urlencoded: [] };
              }
              break;
          }
        }
      } catch (e) {
        console.warn('解析bodyContent失败:', e);
      }

      // 解析headers
      let headers: Array<{ key: string; value: string; enabled: boolean }> = [];
      try {
        if (detail.headers) {
          const headersObj = JSON.parse(detail.headers);
          headers = Object.entries(headersObj).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true
          }));
        }
      } catch (e) {
        console.warn('解析headers失败:', e);
      }

      // 解析queryParams
      let queryParams: Array<{ key: string; value: string; enabled: boolean }> = [];
      try {
        if (detail.params) {
          const paramsObj = JSON.parse(detail.params);
          queryParams = Object.entries(paramsObj).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true
          }));
        }
      } catch (e) {
        console.warn('解析params失败:', e);
      }

      // 转换到 RequestConfig
      const request: RequestConfig = {
        method: detail.method as RequestConfig['method'],
        url: detail.url,
        headers,
        queryParams,
        bodyType: (detail.bodyType || 'json') as RequestConfig['bodyType'],
        body,
      };

      // 优先使用onOpenInNewTab创建新Tab，否则使用onSelectRequest更新当前Tab
      if (onOpenInNewTab) {
        onOpenInNewTab(request, api.name, api.uuid, api.parentUuid);
      } else {
        onSelectRequest(request, api.name, api.uuid, api.parentUuid);
      }
    } catch (error) {
      console.error('[PostABC] 加载API详情失败:', error);
      alert('加载API详情失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取根级项目
  const rootItems = items.filter((item) => item.parentUuid === 'root' || !item.parentUuid);

  // 获取文件夹下的项目
  const getItemsInFolder = (folderUuid: string) => {
    return items.filter((item) => item.parentUuid === folderUuid);
  };

  // 渲染文件夹
  const renderFolder = (folder: ApiInfoDTO) => (
    <div key={folder.uuid} className="select-none">
      {/* 文件夹标题 */}
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer group"
        onClick={() => toggleFolder(folder.uuid)}
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expandedFolders.has(folder.uuid) ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
        {/* 编辑模式：显示输入框 */}
        {editingFolderUuid === folder.uuid ? (
          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder();
                if (e.key === 'Escape') {
                  setEditingFolderUuid(null);
                  setEditingFolderName('');
                }
              }}
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-primary-500 rounded px-1 py-0.5 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleRenameFolder}
              className="p-0.5 text-green-600 hover:text-green-700"
              title="确定"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                setEditingFolderUuid(null);
                setEditingFolderName('');
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600"
              title="取消"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{folder.name}</span>
            {/* 重命名 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolderUuid(folder.uuid);
                setEditingFolderName(folder.name);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="重命名"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {/* 新建子文件夹 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParentFolderUuid(folder.uuid);
                setShowNewFolderInput(true);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="新建子文件夹"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(folder.uuid, folder.name);
              }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              title="删除文件夹"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* 文件夹内的项目 */}
      {expandedFolders.has(folder.uuid) && (
        <div className="pl-6">
          {getItemsInFolder(folder.uuid).map((item) => (
            apiClient.isFolder(item) ? (
              renderFolder(item)
            ) : (
              renderApi(item)
            )
          ))}
        </div>
      )}
    </div>
  );

  // 渲染API
  const renderApi = (api: ApiInfoDTO) => {
    const method = api.method || 'GET';
    const methodColorClass = getHttpMethodColor(method as any);
    return (
      <div
        key={api.uuid}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer group"
        onClick={() => handleSelectApi(api)}
      >
        <span className={`text-xs font-mono font-bold min-w-[50px] text-center ${methodColorClass}`}>
          {method.toUpperCase()}
        </span>
        <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{api.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteItem(api.uuid, api.name);
          }}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title="删除接口"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* 标题 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Collections</span>
          {/* 连接状态指示器 */}
          <div className="flex items-center gap-1">
            {error ? (
              <div className="w-2 h-2 rounded-full bg-red-500" title="未连接" />
            ) : items.length > 0 ? (
              <div className="w-2 h-2 rounded-full bg-green-500" title="已连接" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-400" title="未连接" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 服务端配置 */}
          <button
            onClick={() => setShowServerConfig(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
            title="服务端配置"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* 刷新 */}
          <button
            onClick={loadData}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
            title="刷新"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* 新建文件夹 */}
          <button
            onClick={() => {
              setParentFolderUuid(undefined);
              setShowNewFolderInput(true);
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
            title="新建文件夹"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 新建文件夹输入框 */}
      {showNewFolderInput && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {parentFolderUuid ? '新建子文件夹' : '新建文件夹'}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowNewFolderInput(false);
                  setNewFolderName('');
                  setParentFolderUuid(undefined);
                }
              }}
              placeholder="文件夹名称"
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              title="确定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(false);
                setNewFolderName('');
                setParentFolderUuid(undefined);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="取消"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setShowServerConfig(true)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1"
          >
            点击配置服务端地址
          </button>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* 根级项目 */}
            {rootItems.map((item) =>
              apiClient.isFolder(item) ? renderFolder(item) : renderApi(item)
            )}

            {/* 空状态 */}
            {items.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">暂无数据</p>
                <p className="text-xs mt-1">点击上方按钮创建文件夹或接口</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 服务端配置弹窗 */}
      <ServerConfigModal
        isOpen={showServerConfig}
        onClose={() => {
          setShowServerConfig(false);
          setError(null); // 关闭时清除错误状态
        }}
        onSave={() => {
          // 测试成功后清除错误状态，延迟一下让数据库写入完成
          setError(null);
          // 延迟调用 loadData，确保配置已保存
          setTimeout(() => {
            loadData();
            onRefresh?.();
          }, 100);
        }}
      />
    </div>
  );
}
