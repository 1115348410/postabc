import Dexie, { Table } from 'dexie';
import type { RequestConfig, ResponseData } from '../types';
import type { Environment } from '../types/environment';
import type { RequestItem, RequestCollection } from '../types/collection';

export interface RequestHistoryItem {
  id?: number;
  request: RequestConfig;
  response?: ResponseData;
  timestamp: number;
  name?: string;
  collectionId?: string;
}

export interface CollectionItem {
  id?: number;
  name: string;
  requests: RequestConfig[];
  timestamp: number;
}

export interface EnvironmentVariable {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
  environment: 'global' | 'workspace';
}

// 新增：文件夹
export interface Folder {
  id?: number;
  name: string;
  parentId?: number;
  createdAt: number;
}

// 新增：保存的请求
export interface SavedRequest {
  id?: number;
  name: string;
  folderId?: number;
  request: RequestConfig;
  createdAt: number;
  updatedAt: number;
}

// 服务端配置
export interface ServerConfig {
  id?: number;
  baseUrl: string;
  enabled: boolean | number;
}

// 新增：环境存储项
export interface EnvironmentStorageItem {
  id?: number;
  uuid: string;
  name: string;
  variablesJson: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

// 新增：集合存储项
export interface CollectionStorageItem {
  id?: number;
  uuid: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
}

// 新增：请求存储项
export interface RequestStorageItem {
  id?: number;
  uuid: string;
  name: string;
  collectionId?: string | null;
  requestJson: string;
  createdAt: number;
  updatedAt: number;
}

class PostABCDatabase extends Dexie {
  requestHistory!: Table<RequestHistoryItem>;
  collections!: Table<CollectionItem>;
  environmentVariables!: Table<EnvironmentVariable>;
  folders!: Table<Folder>;
  savedRequests!: Table<SavedRequest>;
  serverConfig!: Table<ServerConfig>;
  environments!: Table<EnvironmentStorageItem>;
  collectionTree!: Table<CollectionStorageItem>;
  requestTree!: Table<RequestStorageItem>;

  constructor() {
    super('PostABCDatabase');
    this.version(4).stores({
      requestHistory: '++id, timestamp, collectionId',
      collections: '++id, name, timestamp',
      environmentVariables: '++id, key, environment',
      folders: '++id, name, parentId, createdAt',
      savedRequests: '++id, name, folderId, createdAt, updatedAt',
      serverConfig: '++id, enabled',
      environments: '++id, uuid, name',
      collectionTree: '++id, uuid, parentId',
      requestTree: '++id, uuid, collectionId',
    });
  }
}

const db = new PostABCDatabase();

export default db;

export const storageAPI = {
  // Request History
  async addRequestHistory(
    request: RequestConfig,
    response?: ResponseData,
  ): Promise<number> {
    return await db.requestHistory.add({
      request,
      response,
      timestamp: Date.now(),
    });
  },

  async getRequestHistory(limit = 50): Promise<RequestHistoryItem[]> {
    return await db.requestHistory
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async deleteRequestHistory(id: number): Promise<void> {
    await db.requestHistory.delete(id);
  },

  async clearRequestHistory(): Promise<void> {
    await db.requestHistory.clear();
  },

  // Collections
  async createCollection(name: string): Promise<number> {
    return await db.collections.add({
      name,
      requests: [],
      timestamp: Date.now(),
    });
  },

  async getCollections(): Promise<CollectionItem[]> {
    return await db.collections.orderBy('timestamp').reverse().toArray();
  },

  async updateCollection(id: number, data: Partial<CollectionItem>): Promise<void> {
    await db.collections.update(id, data);
  },

  async deleteCollection(id: number): Promise<void> {
    await db.collections.delete(id);
  },

  async addRequestToCollection(
    collectionId: number,
    request: RequestConfig,
  ): Promise<void> {
    const collection = await db.collections.get(collectionId);
    if (collection) {
      await db.collections.update(collectionId, {
        requests: [...collection.requests, request],
      });
    }
  },

  async removeRequestFromCollection(
    collectionId: number,
    requestIndex: number,
  ): Promise<void> {
    const collection = await db.collections.get(collectionId);
    if (collection) {
      const newRequests = collection.requests.filter((_, i) => i !== requestIndex);
      await db.collections.update(collectionId, { requests: newRequests });
    }
  },

  // Environment Variables
  async setEnvironmentVariable(
    key: string,
    value: string,
    environment: 'global' | 'workspace' = 'global',
    enabled = true,
  ): Promise<number> {
    // Check if variable already exists
    const existing = await db.environmentVariables
      .where({ key, environment })
      .first();

    if (existing && existing.id) {
      await db.environmentVariables.update(existing.id, { value, enabled });
      return existing.id;
    }

    return await db.environmentVariables.add({
      key,
      value,
      enabled,
      environment,
    });
  },

  async getEnvironmentVariables(
    environment: 'global' | 'workspace' = 'global',
  ): Promise<EnvironmentVariable[]> {
    return await db.environmentVariables
      .where({ environment })
      .toArray();
  },

  async updateEnvironmentVariable(
    id: number,
    data: Partial<EnvironmentVariable>,
  ): Promise<void> {
    await db.environmentVariables.update(id, data);
  },

  async deleteEnvironmentVariable(id: number): Promise<void> {
    await db.environmentVariables.delete(id);
  },

  async getActiveEnvironmentVariables(
    environment: 'global' | 'workspace' = 'global',
  ): Promise<Record<string, string>> {
    // 使用 where('environment') 查询，然后在内存中过滤 enabled
    // 因为 Dexie 复合查询需要复合索引
    const allVariables = await db.environmentVariables
      .where('environment')
      .equals(environment)
      .toArray();

    const result: Record<string, string> = {};
    allVariables
      .filter((v) => v.enabled === true)
      .forEach((v) => {
        result[v.key] = v.value;
      });

    console.log('[Storage] 环境变量查询结果:', result, '总计:', Object.keys(result).length, '个');
    return result;
  },

  // Folders - 新增
  async createFolder(name: string, parentId?: number): Promise<number> {
    return await db.folders.add({
      name,
      parentId,
      createdAt: Date.now(),
    });
  },

  async getFolders(): Promise<Folder[]> {
    return await db.folders.orderBy('createdAt').toArray();
  },

  async updateFolder(id: number, data: Partial<Folder>): Promise<void> {
    await db.folders.update(id, data);
  },

  async deleteFolder(id: number): Promise<void> {
    // 删除文件夹及其下的所有请求
    await db.savedRequests.where('folderId').equals(id).delete();
    await db.folders.delete(id);
  },

  // Saved Requests - 新增
  async createSavedRequest(
    name: string,
    request: RequestConfig,
    folderId?: number,
  ): Promise<number> {
    const now = Date.now();
    return await db.savedRequests.add({
      name,
      request,
      folderId,
      createdAt: now,
      updatedAt: now,
    });
  },

  async getSavedRequests(): Promise<SavedRequest[]> {
    return await db.savedRequests.orderBy('updatedAt').reverse().toArray();
  },

  async updateSavedRequest(id: number, data: Partial<SavedRequest>): Promise<void> {
    await db.savedRequests.update(id, { ...data, updatedAt: Date.now() });
  },

  async deleteSavedRequest(id: number): Promise<void> {
    await db.savedRequests.delete(id);
  },

  // Server Config
  async setServerConfig(baseUrl: string, enabled = true): Promise<number> {
    // 清除现有配置
    await db.serverConfig.clear();
    // enabled 必须存为数字 1，因为 getActiveServerBaseUrl 使用 .equals(1) 查询
    return await db.serverConfig.add({
      baseUrl,
      enabled: enabled ? 1 : 0,
    });
  },

  async getServerConfig(): Promise<ServerConfig | null> {
    const config = await db.serverConfig.toArray();
    return config.length > 0 ? config[0] : null;
  },

  async getActiveServerBaseUrl(): Promise<string | null> {
    // 直接查询所有配置，取第一条（最新的）
    const configs = await db.serverConfig.toArray();
    if (configs.length > 0) {
      return configs[0].baseUrl;
    }
    return null;
  },

  async deleteServerConfig(id: number): Promise<void> {
    await db.serverConfig.delete(id);
  },

  async saveActiveServerBaseUrl(baseUrl: string): Promise<void> {
    // 清除现有配置
    await db.serverConfig.clear();
    // 保存新配置
    await db.serverConfig.add({
      baseUrl,
      enabled: true,
    });
  },

  // ========== 环境管理 (API v2 同步用) ==========

  /**
   * 清空所有环境
   */
  async clearEnvironments(): Promise<void> {
    await db.environments.clear();
  },

  /**
   * 添加环境
   */
  async addEnvironment(environment: Environment): Promise<void> {
    await db.environments.add({
      uuid: environment.id,
      name: environment.name,
      variablesJson: JSON.stringify(environment.variables),
      color: environment.color,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    });
  },

  /**
   * 获取所有环境
   */
  async getEnvironments(): Promise<Environment[]> {
    const items = await db.environments.toArray();
    return items.map(item => ({
      id: item.uuid,
      name: item.name,
      variables: JSON.parse(item.variablesJson),
      color: item.color,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },

  // ========== 集合管理 (API v2 同步用) ==========

  /**
   * 添加集合
   */
  async addCollection(collection: RequestCollection): Promise<void> {
    await db.collectionTree.add({
      uuid: collection.uuid,
      name: collection.name,
      parentId: collection.parentId,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    });
  },

  /**
   * 获取根集合列表
   */
  async getRootCollections(): Promise<RequestCollection[]> {
    const items = await db.collectionTree
      .where('parentId')
      .equals(null as unknown as string)
      .toArray();

    return items.map(item => ({
      uuid: item.uuid,
      name: item.name,
      parentId: item.parentId || null,
      children: [],
      requests: [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },

  // ========== 请求管理 (API v2 同步用) ==========

  /**
   * 添加请求
   */
  async addRequest(request: RequestItem): Promise<void> {
    await db.requestTree.add({
      uuid: request.uuid || request.id,
      name: request.name,
      collectionId: request.collectionId,
      requestJson: JSON.stringify(request.request),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  },

  /**
   * 获取集合下的请求列表
   */
  async getRequestsByCollectionId(collectionId: string): Promise<RequestItem[]> {
    const items = await db.requestTree
      .where('collectionId')
      .equals(collectionId)
      .toArray();

    return items.map(item => ({
      id: item.uuid,
      uuid: item.uuid,
      name: item.name,
      collectionId: item.collectionId || null,
      request: JSON.parse(item.requestJson),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },
};
