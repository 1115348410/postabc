import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, type ApiInfoEnvDTO } from '../services/api-client';
import { saveEnvironmentVariables, getEnvironmentVariablesMap } from '../services/environment-service';
import { validateVariableName } from '../utils/variables/validation';

interface LocalEnvVariable {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
}

interface EditingVariable {
  key: string;
  value: string;
  enabled: boolean;
  originalId?: number;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onVariablesChange?: (variables: Record<string, string>) => void;
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

export default function EnvironmentManager({
  isOpen,
  onClose,
  onVariablesChange,
}: EnvironmentManagerProps) {
  const [originalVariables, setOriginalVariables] = useState<(ApiInfoEnvDTO | LocalEnvVariable)[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, EditingVariable>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [useServer, setUseServer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextTempId, setNextTempId] = useState(1);
  const newKeyInputRef = useRef<HTMLInputElement>(null);

  const loadVariables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = await getServerBaseUrl();
      if (baseUrl) {
        setUseServer(true);
        const data = await apiClient.getEnvVariables();
        setOriginalVariables(data);

        // 初始化编辑状态
        const initialEditingValues: Record<string, EditingVariable> = {};
        data.forEach(v => {
          const id = 'id' in v && v.id !== undefined ? String(v.id) : ('envKey' in v ? v.envKey : v.key);
          initialEditingValues[id] = {
            key: 'envKey' in v ? v.envKey : v.key,
            value: 'envValue' in v ? v.envValue : v.value,
            enabled: 'enabled' in v ? v.enabled : true,
            originalId: 'id' in v ? v.id : undefined,
          };
        });
        setEditingValues(initialEditingValues);

        // 转换为键值对格式并缓存
        const varsMap: Record<string, string> = {};
        data.forEach(v => {
          const enabled = 'enabled' in v ? v.enabled : true;
          if (enabled) {
            varsMap['envKey' in v ? v.envKey : v.key] = 'envValue' in v ? v.envValue : v.value;
          }
        });
        await saveEnvironmentVariables(data as ApiInfoEnvDTO[]);
        onVariablesChange?.(varsMap);
      } else {
        setUseServer(false);
        // 尝试从缓存加载
        const cachedVars = await getEnvironmentVariablesMap();
        if (Object.keys(cachedVars).length > 0) {
          const cachedVariables: LocalEnvVariable[] = Object.entries(cachedVars).map(([key, value], index) => ({
            id: index + 1,
            key: key,
            value: value,
            enabled: true
          }));
          setOriginalVariables(cachedVariables);

          // 初始化编辑状态
          const initialEditingValues: Record<string, EditingVariable> = {};
          cachedVariables.forEach(v => {
            const id = String(v.id);
            initialEditingValues[id] = {
              key: v.key,
              value: v.value,
              enabled: v.enabled,
              originalId: v.id,
            };
          });
          setEditingValues(initialEditingValues);
          onVariablesChange?.(cachedVars);
        } else {
          setOriginalVariables([]);
          setEditingValues({});
        }
      }
    } catch (err) {
      console.error('[PostABC] 加载环境变量失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
      setUseServer(false);
      // 尝试从缓存加载
      const cachedVars = await getEnvironmentVariablesMap();
      if (Object.keys(cachedVars).length > 0) {
        const cachedVariables: LocalEnvVariable[] = Object.entries(cachedVars).map(([key, value], index) => ({
          id: index + 1,
          key: key,
          value: value,
          enabled: true
        }));
        setOriginalVariables(cachedVariables);

        const initialEditingValues: Record<string, EditingVariable> = {};
        cachedVariables.forEach(v => {
          const id = String(v.id);
          initialEditingValues[id] = {
            key: v.key,
            value: v.value,
            enabled: v.enabled,
            originalId: v.id,
          };
        });
        setEditingValues(initialEditingValues);
        onVariablesChange?.(cachedVars);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onVariablesChange]);

  useEffect(() => {
    if (isOpen) {
      loadVariables();
      setSearchQuery('');
      setNextTempId(1);
      setValidationError(null);
      setError(null);
    }
  }, [isOpen, loadVariables]);

  const handleAddVariable = () => {
    if (!newKey.trim()) return;

    // 校验变量名
    const validation = validateVariableName(newKey.trim());
    if (!validation.valid) {
      setValidationError(validation.error || '变量名无效');
      return;
    }

    // 检查是否已存在相同的key（包括已删除的）
    const existingEntry = Object.entries(editingValues).find(([_, v]) => 
      v.key === newKey.trim() && !v.isDeleted
    );
    if (existingEntry) {
      setValidationError('变量名已存在');
      return;
    }

    setValidationError(null);

    // 添加到编辑状态（临时ID）
    const tempId = `temp_${nextTempId}`;
    setEditingValues(prev => ({
      ...prev,
      [tempId]: {
        key: newKey.trim(),
        value: newValue.trim(),
        enabled: true,
        isNew: true,
      }
    }));
    setNextTempId(prev => prev + 1);
    setNewKey('');
    setNewValue('');
    
    // 保持焦点在变量名输入框
    setTimeout(() => {
      newKeyInputRef.current?.focus();
    }, 0);
  };

  const handleInputChange = (id: string, field: 'key' | 'value', newVal: string) => {
    setEditingValues(prev => {
      const variable = prev[id];
      if (!variable) return prev;
      
      // 检查是否真的修改了
      const isActuallyModified = field === 'key' 
        ? newVal !== variable.key 
        : newVal !== variable.value;
      
      return {
        ...prev,
        [id]: {
          ...variable,
          [field]: newVal,
          isModified: variable.isNew ? false : (variable.isModified || isActuallyModified)
        }
      };
    });
  };

  const handleToggleEnabled = (id: string) => {
    setEditingValues(prev => {
      const variable = prev[id];
      if (!variable) return prev;
      
      return {
        ...prev,
        [id]: {
          ...variable,
          enabled: !variable.enabled,
          isModified: variable.isNew ? false : true
        }
      };
    });
  };

  const handleDeleteVariable = (id: string) => {
    setEditingValues(prev => {
      const variable = prev[id];
      if (variable?.isNew) {
        // 如果是新添加的，直接删除
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      } else {
        // 否则标记为删除
        return {
          ...prev,
          [id]: {
            ...variable,
            isDeleted: true
          }
        };
      }
    });
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{{${key}}}`);
      console.log('已复制:', `{{${key}}}`);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleCancel = () => {
    // 重置所有状态
    setEditingValues({});
    setNewKey('');
    setNewValue('');
    setSearchQuery('');
    setValidationError(null);
    setError(null);
    onClose();
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // 收集所有变更
      const toSave: EditingVariable[] = [];
      const toDelete: EditingVariable[] = [];

      Object.entries(editingValues).forEach(([id, variable]) => {
        if (variable.isDeleted) {
          toDelete.push(variable);
        } else if (variable.key.trim()) {
          // 校验变量名
          const validation = validateVariableName(variable.key.trim());
          if (!validation.valid) {
            throw new Error(`变量名 "${variable.key}" 无效: ${validation.error}`);
          }
          toSave.push(variable);
        }
      });

      // 检查重复的key
      const keySet = new Set<string>();
      for (const v of toSave) {
        if (keySet.has(v.key)) {
          throw new Error(`存在重复的变量名: "${v.key}"`);
        }
        keySet.add(v.key);
      }

      if (useServer) {
        // 服务器模式：逐个保存和删除
        for (const variable of toDelete) {
          if (variable.originalId) {
            await apiClient.deleteEnvVariable(variable.originalId);
          }
        }

        for (const variable of toSave) {
          await apiClient.saveEnvVariable({
            id: variable.isNew ? undefined : variable.originalId,
            envKey: variable.key,
            envValue: variable.value,
          });
        }
      } else {
        // 本地模式：批量保存
        const varsArray: LocalEnvVariable[] = toSave.map((v, index) => ({
          id: v.originalId || index + 1,
          key: v.key,
          value: v.value,
          enabled: v.enabled
        }));
        
        // 保存完整数据
        await saveEnvironmentVariables(varsArray.map((v, index) => ({
          id: v.id || index + 1,
          envKey: v.key,
          envValue: v.value
        })));
        
        // 只传递启用的变量给父组件
        const enabledVars: Record<string, string> = {};
        toSave.forEach(v => {
          if (v.enabled) {
            enabledVars[v.key] = v.value;
          }
        });
        onVariablesChange?.(enabledVars);
      }

      // 重新加载
      await loadVariables();
      onClose();
    } catch (err) {
      console.error('[PostABC] 保存变量失败:', err);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 过滤显示的变量
  const filteredEntries = Object.entries(editingValues).filter(([_, v]) => {
    if (v.isDeleted) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return v.key.toLowerCase().includes(query) || v.value.toLowerCase().includes(query);
  });

  // 获取变量显示信息
  const getVariableDisplayInfo = (id: string) => {
    const variable = editingValues[id];
    if (!variable) return null;
    return {
      key: variable.key,
      value: variable.value,
      enabled: variable.enabled,
      isNew: variable.isNew,
      isModified: variable.isModified,
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">环境变量</h2>
            {useServer && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                云端同步
              </span>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索变量名或值..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Variables List - Fixed height with scroll */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <svg className="w-6 h-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {searchQuery ? '没有找到匹配的变量' : '暂无变量'}
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 space-y-2">
              {filteredEntries.map(([id]) => {
                const displayInfo = getVariableDisplayInfo(id);
                if (!displayInfo) return null;

                return (
                  <div
                    key={id}
                    className={`flex items-center gap-2 p-3 rounded border ${
                      displayInfo.enabled
                        ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 opacity-50'
                    }`}
                  >
                    {/* 启用/禁用切换 */}
                    <button
                      onClick={() => handleToggleEnabled(id)}
                      className={`p-1 rounded transition-colors ${
                        displayInfo.enabled
                          ? 'text-green-500 hover:text-green-600'
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                      title={displayInfo.enabled ? '点击禁用' : '点击启用'}
                    >
                      <svg className="w-4 h-4" fill={displayInfo.enabled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <input
                      type="text"
                      value={displayInfo.key}
                      onChange={(e) => handleInputChange(id, 'key', e.target.value)}
                      placeholder="变量名"
                      className="flex-1 bg-transparent text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />

                    <button
                      onClick={() => handleCopyKey(displayInfo.key)}
                      className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                      title={`复制 {{${displayInfo.key}}}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    <span className="text-gray-400 dark:text-gray-600">:</span>

                    <input
                      type="text"
                      value={displayInfo.value}
                      onChange={(e) => handleInputChange(id, 'value', e.target.value)}
                      placeholder="变量值"
                      className="flex-1 bg-transparent text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />

                    {/* 状态标签 */}
                    <div className="flex gap-1">
                      {displayInfo.isNew && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          新
                        </span>
                      )}
                      {displayInfo.isModified && !displayInfo.isNew && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                          改
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteVariable(id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      aria-label="删除变量"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Variable */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {/* 验证错误提示 */}
          {validationError && (
            <div className="mb-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ {validationError}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={newKeyInputRef}
              type="text"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setValidationError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="变量名"
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
            <span className="text-gray-400 dark:text-gray-600">:</span>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="变量值"
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleAddVariable}
              disabled={!newKey.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              添加
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
