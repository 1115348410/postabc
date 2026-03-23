/**
 * 环境变量服务
 * 使用 chrome.storage.local 缓存环境变量，确保持久化
 */

export interface EnvironmentVariable {
  id: number;
  envKey: string;
  envValue: string;
}

const STORAGE_KEY = 'postabc_environment_variables';

/**
 * 保存环境变量到 chrome.storage
 */
export async function saveEnvironmentVariables(variables: EnvironmentVariable[]): Promise<void> {
  return new Promise((resolve) => {
    // 转换为键值对格式，便于快速查找
    const varsMap: Record<string, string> = {};
    variables.forEach(v => {
      varsMap[v.envKey] = v.envValue;
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        [STORAGE_KEY]: {
          variables,
          varsMap,
          updatedAt: Date.now()
        }
      }, () => {
        console.log('[EnvService] 环境变量已保存到 chrome.storage:', Object.keys(varsMap));
        resolve();
      });
    } else {
      // 回退到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        variables,
        varsMap,
        updatedAt: Date.now()
      }));
      console.log('[EnvService] 环境变量已保存到 localStorage:', Object.keys(varsMap));
      resolve();
    }
  });
}

/**
 * 从 chrome.storage 获取环境变量映射
 */
export async function getEnvironmentVariablesMap(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const data = result[STORAGE_KEY];
        if (data && data.varsMap) {
          console.log('[EnvService] 从 chrome.storage 获取环境变量:', Object.keys(data.varsMap));
          resolve(data.varsMap);
        } else {
          console.log('[EnvService] chrome.storage 中无环境变量缓存');
          resolve({});
        }
      });
    } else {
      // 回退到 localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('[EnvService] 从 localStorage 获取环境变量:', Object.keys(data.varsMap || {}));
        resolve(data.varsMap || {});
      } else {
        console.log('[EnvService] localStorage 中无环境变量缓存');
        resolve({});
      }
    }
  });
}

/**
 * 从 chrome.storage 获取环境变量列表
 */
export async function getEnvironmentVariables(): Promise<EnvironmentVariable[]> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const data = result[STORAGE_KEY];
        if (data && data.variables) {
          resolve(data.variables);
        } else {
          resolve([]);
        }
      });
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        resolve(data.variables || []);
      } else {
        resolve([]);
      }
    }
  });
}

/**
 * 清除环境变量缓存
 */
export async function clearEnvironmentVariables(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      resolve();
    }
  });
}
