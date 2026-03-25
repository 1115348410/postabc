import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, type ApiInfoDTO } from '../services/api-client';
import type { RequestConfig } from '../types';

interface SaveRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestConfig;
  onSaveSuccess: (apiUuid?: string, parentUuid?: string, name?: string) => void;
  // 编辑模式
  apiUuid?: string;      // 已保存接口的UUID，有值表示编辑模式
  parentUuid?: string;   // 所属文件夹UUID
  apiName?: string;      // 已保存接口的名称
}

interface FolderNode extends ApiInfoDTO {
  children: FolderNode[];
  isLoaded?: boolean;
}

export default function SaveRequestDialog({
  isOpen,
  onClose,
  request,
  onSaveSuccess,
  apiUuid,
  parentUuid: initialParentUuid,
  apiName,
}: SaveRequestDialogProps) {
  const [name, setName] = useState('');
  const [selectedFolderUuid, setSelectedFolderUuid] = useState<string>('');
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 判断是否为编辑模式
  const isEditMode = !!apiUuid;

  // 构建文件夹树
  const buildFolderTree = useCallback((folders: ApiInfoDTO[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // 首先创建所有文件夹节点
    folders.forEach(folder => {
      if (apiClient.isFolder(folder)) {
        folderMap.set(folder.uuid, {
          ...folder,
          children: [],
          isLoaded: true
        });
      }
    });

    // 然后构建树形结构
    folders.forEach(folder => {
      if (apiClient.isFolder(folder)) {
        const node = folderMap.get(folder.uuid);
        if (node) {
          if (folder.parentUuid && folder.parentUuid !== 'root' && folderMap.has(folder.parentUuid)) {
            const parent = folderMap.get(folder.parentUuid);
            parent?.children.push(node);
          } else {
            rootFolders.push(node);
          }
        }
      }
    });

    return rootFolders;
  }, []);

  // 加载文件夹列表
  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      // 加载根目录
      const items = await apiClient.listDirectory();
      const allFolders: ApiInfoDTO[] = [...items.filter(item => apiClient.isFolder(item))];
      
      // 加载所有子文件夹
      for (const item of items) {
        if (apiClient.isFolder(item)) {
          try {
            const children = await apiClient.listDirectory(item.uuid);
            allFolders.push(...children.filter(child => apiClient.isFolder(child)));
          } catch (err) {
            console.warn(`加载文件夹 ${item.uuid} 的子项失败:`, err);
          }
        }
      }
      
      const tree = buildFolderTree(allFolders);
      setFolderTree(tree);
      
      // 展开包含选中文件夹的路径
      if (initialParentUuid) {
        expandPathToFolder(allFolders, initialParentUuid);
      }
    } catch (error) {
      console.error('[PostABC] 加载文件夹失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialParentUuid, buildFolderTree]);

  // 展开到指定文件夹的路径
  const expandPathToFolder = (folders: ApiInfoDTO[], targetUuid: string) => {
    const path: string[] = [];
    let current = folders.find(f => f.uuid === targetUuid);
    
    while (current) {
      path.push(current.uuid);
      if (current.parentUuid && current.parentUuid !== 'root') {
        current = folders.find(f => f.uuid === current!.parentUuid);
      } else {
        break;
      }
    }
    
    setExpandedFolders(new Set(path));
  };

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      // 编辑模式：使用已有的名称和文件夹
      if (isEditMode) {
        setName(apiName || '');
        setSelectedFolderUuid(initialParentUuid || '');
      } else {
        // 新增模式：默认名称使用 URL 的路径部分
        try {
          const url = new URL(request.url);
          setName(url.pathname.split('/').pop() || request.url);
        } catch {
          setName(request.url || '未命名请求');
        }
        setSelectedFolderUuid(initialParentUuid || '');
      }
    }
  }, [isOpen, request, isEditMode, apiName, initialParentUuid, loadFolders]);

  const toggleFolder = (folderUuid: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderUuid)) {
        next.delete(folderUuid);
      } else {
        next.add(folderUuid);
      }
      return next;
    });
  };

  const handleSelectFolder = (folderUuid: string) => {
    setSelectedFolderUuid(folderUuid);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入请求名称');
      return;
    }

    // 必须选择文件夹
    if (!selectedFolderUuid) {
      alert('请选择保存的文件夹，或先在Collection栏创建文件夹');
      return;
    }

    setIsSaving(true);
    try {
      // 构建JSON格式字段 (v2 格式)
      const params: Record<string, string> = {};
      request.queryParams?.forEach(p => {
        if (p.enabled && p.key) params[p.key] = p.value;
      });

      const headers: Record<string, string> = {};
      request.headers?.forEach(h => {
        if (h.enabled && h.key) headers[h.key] = h.value;
      });

      // 根据 bodyType 构建 bodyContent
      let bodyContent = '{}';
      switch (request.bodyType) {
        case 'json':
          bodyContent = request.body?.json || '{}';
          break;
        case 'raw':
          bodyContent = request.body?.raw || '';
          break;
        case 'form-data':
          bodyContent = request.body?.form ? JSON.stringify(request.body.form) : '[]';
          break;
        case 'urlencoded':
          bodyContent = request.body?.urlencoded ? JSON.stringify(request.body.urlencoded) : '[]';
          break;
        default:
          bodyContent = '{}';
      }

      if (isEditMode && apiUuid) {
        // 编辑模式：更新已有接口
        await apiClient.updateApi(apiUuid, {
          method: request.method,
          url: request.url,
          params: JSON.stringify(params),
          headers: JSON.stringify(headers),
          bodyType: request.bodyType || 'json',
          bodyContent: bodyContent,
          preScript: '',
          testScript: '',
          sseFlag: false,
          ssePaths: '{}'
        });
        // 同时更新名称
        await apiClient.updateApiName(apiUuid, name.trim());
        onSaveSuccess(apiUuid, selectedFolderUuid, name.trim());
      } else {
        // 新增模式：创建新接口
        const newUuid = await apiClient.createApi(
          name.trim(),
          selectedFolderUuid,
          {
            method: request.method,
            url: request.url,
            params: JSON.stringify(params),
            headers: JSON.stringify(headers),
            bodyType: request.bodyType || 'json',
            bodyContent: bodyContent,
            preScript: '',
            testScript: '',
            sseFlag: false,
            ssePaths: '{}'
          }
        );
        onSaveSuccess(newUuid, selectedFolderUuid, name.trim());
      }
      onClose();
    } catch (error) {
      console.error('[PostABC] 保存请求失败:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  // 渲染文件夹树节点
  const renderFolderNode = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.uuid);
    const isSelected = selectedFolderUuid === folder.uuid;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.uuid}>
        <div
          className={`flex items-center gap-1 px-2 py-2 cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-600 dark:bg-blue-700 text-white border-l-4 border-blue-800 dark:border-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-4 border-transparent'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleSelectFolder(folder.uuid)}
        >
          {/* 展开/收起按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleFolder(folder.uuid);
              }
            }}
            className={`p-0.5 rounded transition-transform ${
              hasChildren 
                ? (isSelected ? 'hover:bg-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-600') 
                : 'invisible'
            }`}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isSelected ? 'text-blue-200' : 'text-gray-400'} ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 文件夹图标 */}
          <svg 
            className={`w-4 h-4 ml-1 ${isSelected ? 'text-white' : 'text-yellow-500'}`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>

          {/* 文件夹名称 */}
          <span className={`flex-1 text-sm truncate ml-1 ${isSelected ? 'font-semibold text-white' : ''}`}>
            {folder.name}
          </span>

          {/* 选中标记 */}
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* 子文件夹 */}
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map(child => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 获取选中文件夹的完整路径
  const getSelectedFolderPath = useCallback((folders: FolderNode[], targetUuid: string): string[] | null => {
    for (const folder of folders) {
      if (folder.uuid === targetUuid) {
        return [folder.name];
      }
      if (folder.children && folder.children.length > 0) {
        const childResult = getSelectedFolderPath(folder.children, targetUuid);
        if (childResult) {
          return [folder.name, ...childResult];
        }
      }
    }
    return null;
  }, []);

  // 使用 useMemo 计算选中路径，确保在 folderTree 或 selectedFolderUuid 变化时重新计算
  const selectedPath = useMemo(() => {
    if (!selectedFolderUuid || folderTree.length === 0) {
      return null;
    }
    const pathArray = getSelectedFolderPath(folderTree, selectedFolderUuid);
    return pathArray ? pathArray.join(' / ') : null;
  }, [folderTree, selectedFolderUuid, getSelectedFolderPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEditMode ? '编辑接口' : '保存新接口'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            title="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 请求名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              接口名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入接口名称"
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* 选择文件夹 - 树形结构 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              保存到文件夹
            </label>
            
            {/* 已选文件夹路径显示 */}
            {selectedPath && (
              <div className="mb-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded text-sm text-primary-700 dark:text-primary-300">
                已选择: {selectedPath}
              </div>
            )}
            
            {/* 文件夹树 */}
            <div className="border border-gray-300 dark:border-gray-600 rounded max-h-60 overflow-y-auto bg-white dark:bg-gray-700">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : folderTree.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  <p>暂无文件夹</p>
                  <p className="mt-1 text-xs">请在左侧 Collection 栏点击 "+" 创建文件夹</p>
                </div>
              ) : (
                <div className="py-1">
                  {folderTree.map(folder => renderFolderNode(folder))}
                </div>
              )}
            </div>
            
            {!selectedFolderUuid && folderTree.length > 0 && (
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                请从上方列表中选择一个文件夹
              </p>
            )}
          </div>

          {/* 请求预览 */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className={`font-medium ${
              request.method === 'GET' ? 'text-green-600 dark:text-green-400' :
              request.method === 'POST' ? 'text-blue-600 dark:text-blue-400' :
              request.method === 'PUT' ? 'text-orange-600 dark:text-orange-400' :
              request.method === 'DELETE' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {request.method}
            </span>
            {' '}
            <span className="text-gray-700 dark:text-gray-300 truncate">{request.url}</span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !selectedFolderUuid}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : (isEditMode ? '更新' : '保存')}
          </button>
        </div>
      </div>
    </div>
  );
}
