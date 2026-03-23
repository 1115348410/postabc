import { apiClient, type ApiInfoDTO, type ApiInfoItemDTO, type ApiInfoEnvDTO } from './api-client';
import { RequestItem, RequestCollection } from '../types/collection';
import { Environment } from '../types/environment';
import { storageAPI } from '../storage/indexed-db';
import { HttpRequest } from '../types/request';

/**
 * API同步服务，用于将PostABC本地数据与远程API服务同步
 * 适配 API v2 接口格式
 */
export class ApiSyncService {
  private client = apiClient;

  /**
   * 从远程API加载所有数据（文件夹、API接口、环境变量）
   */
  async syncFromRemote(): Promise<void> {
    console.log('开始从远程API同步数据...');

    try {
      // 同步环境变量
      await this.syncEnvVariablesFromRemote();

      // 同步API接口和文件夹
      await this.syncApiCollectionFromRemote();

      console.log('远程数据同步完成');
    } catch (error) {
      console.error('同步远程数据失败:', error);
      throw error;
    }
  }

  /**
   * 将本地数据同步到远程API
   */
  async syncToRemote(): Promise<void> {
    console.log('开始同步本地数据到远程API...');

    try {
      // 同步环境变量
      await this.syncEnvVariablesToRemote();

      // 同步API接口和文件夹
      await this.syncApiCollectionToRemote();

      console.log('本地数据同步到远程完成');
    } catch (error) {
      console.error('同步本地数据到远程失败:', error);
      throw error;
    }
  }

  /**
   * 同步环境变量 - 从远程加载到本地
   * 实际格式: { id, envKey, envValue }
   */
  private async syncEnvVariablesFromRemote(): Promise<void> {
    try {
      // 获取远程环境变量
      const remoteVariables = await this.client.getEnvVariables();

      // 清空本地环境变量并添加远程数据
      await storageAPI.clearEnvironments();

      for (const remoteVar of remoteVariables) {
        // 实际格式: id, envKey, envValue
        const localEnv: Environment = {
          id: String(remoteVar.id),
          name: remoteVar.envKey,
          variables: [{
            key: remoteVar.envKey,
            value: remoteVar.envValue,
            enabled: true
          }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await storageAPI.addEnvironment(localEnv);
      }

      console.log(`已从远程同步 ${remoteVariables.length} 个环境变量`);
    } catch (error) {
      console.error('同步环境变量失败:', error);
      throw error;
    }
  }

  /**
   * 同步环境变量 - 从本地上传到远程
   */
  private async syncEnvVariablesToRemote(): Promise<void> {
    try {
      // 获取本地环境变量
      const localEnvs = await storageAPI.getEnvironments();

      // 获取远程已有的环境变量
      const remoteVariables = await this.client.getEnvVariables();

      for (const localEnv of localEnvs) {
        // 从本地环境变量中提取第一个变量
        const firstVar = localEnv.variables[0];

        // 检查远程是否存在相同名称的环境变量
        const existingVar = remoteVariables.find(v => v.envKey === localEnv.name);

        // 构建请求
        await this.client.saveEnvVariable({
          id: existingVar?.id,
          envKey: localEnv.name,
          envValue: firstVar?.value || ''
        });
      }

      console.log(`已同步本地环境变量到远程`);
    } catch (error) {
      console.error('同步环境变量到远程失败:', error);
      throw error;
    }
  }

  /**
   * 同步API集合和文件夹 - 从远程加载到本地
   */
  private async syncApiCollectionFromRemote(): Promise<void> {
    try {
      // 从根目录开始同步
      await this.syncCollectionFromRemote('root');
    } catch (error) {
      console.error('同步API集合失败:', error);
      throw error;
    }
  }

  /**
   * 递归同步API集合 (v2)
   * 使用 type 字段判断文件夹(0)和API接口(1)
   */
  private async syncCollectionFromRemote(parentUuid: string, parentId?: string): Promise<void> {
    // 获取远程目录列表
    const remoteItems = await this.client.listDirectory(parentUuid === 'root' ? undefined : parentUuid);

    for (const remoteItem of remoteItems) {
      if (this.client.isFolder(remoteItem)) {
        // 这是一个文件夹 (type = 0)
        await this.syncFolderFromRemote(remoteItem, parentId);
      } else {
        // 这是一个API接口 (type = 1)
        await this.syncApiFromRemote(remoteItem, parentId);
      }
    }
  }

  /**
   * 同步单个文件夹从远程
   */
  private async syncFolderFromRemote(folder: ApiInfoDTO, parentId?: string): Promise<void> {
    // 创建本地文件夹
    const localCollection: RequestCollection = {
      uuid: folder.uuid,
      name: folder.name,
      parentId: parentId,
      children: [],
      requests: [],
      createdAt: folder.createTime ? new Date(folder.createTime).getTime() : Date.now(),
      updatedAt: folder.createTime ? new Date(folder.createTime).getTime() : Date.now()
    };

    await storageAPI.addCollection(localCollection);

    // 递归同步子项
    await this.syncCollectionFromRemote(folder.uuid, folder.uuid);
  }

  /**
   * 同步单个API接口从远程 (v2)
   * 新格式: { uuid, method, url, params, headers, bodyType, bodyContent, preScript, testScript, sseFlag, ssePaths }
   */
  private async syncApiFromRemote(apiInfo: ApiInfoDTO, parentId?: string): Promise<void> {
    try {
      // 获取API详情
      const apiDetail = await this.client.getApiDetail(apiInfo.uuid);

      // 解析JSON格式字段
      let params: Record<string, unknown> = {};
      let headers: Record<string, unknown> = {};
      let bodyContent: Record<string, unknown> = {};

      try {
        if (apiDetail.params) {
          params = JSON.parse(apiDetail.params);
        }
      } catch (e) {
        console.warn('解析params失败:', e);
      }

      try {
        if (apiDetail.headers) {
          headers = JSON.parse(apiDetail.headers);
        }
      } catch (e) {
        console.warn('解析headers失败:', e);
      }

      try {
        if (apiDetail.bodyContent) {
          bodyContent = JSON.parse(apiDetail.bodyContent);
        }
      } catch (e) {
        console.warn('解析bodyContent失败:', e);
      }

      // 创建本地请求项
      const localRequest: RequestItem = {
        id: apiInfo.uuid,
        uuid: apiInfo.uuid,
        name: apiInfo.name,
        collectionId: parentId || null,
        request: {
          method: apiDetail.method,
          url: apiDetail.url,
          params: params,
          headers: headers,
          body: {
            type: apiDetail.bodyType || 'json',
            content: typeof bodyContent === 'string' ? bodyContent : JSON.stringify(bodyContent, null, 2)
          },
          preRequestScript: apiDetail.preScript || '',
          testScript: apiDetail.testScript || ''
        } satisfies HttpRequest,
        createdAt: apiInfo.createTime ? new Date(apiInfo.createTime).getTime() : Date.now(),
        updatedAt: Date.now(),
        parentId: parentId || null
      };

      await storageAPI.addRequest(localRequest);
    } catch (error) {
      console.error(`获取API详情失败 (UUID: ${apiInfo.uuid}):`, error);
    }
  }

  /**
   * 同步API集合和文件夹 - 从本地上传到远程
   */
  private async syncApiCollectionToRemote(): Promise<void> {
    try {
      // 先同步根目录的集合
      const rootCollections = await storageAPI.getRootCollections();
      for (const collection of rootCollections) {
        await this.syncCollectionToRemote(collection);
      }

      console.log('API集合同步到远程完成');
    } catch (error) {
      console.error('同步API集合到远程失败:', error);
      throw error;
    }
  }

  /**
   * 递归同步单个集合到远程 (v2)
   */
  private async syncCollectionToRemote(collection: RequestCollection): Promise<void> {
    // 检查远程是否存在该文件夹
    const remoteItems = await this.client.listDirectory(collection.parentId || undefined);
    const existingFolder = remoteItems.find(item =>
      this.client.isFolder(item) && item.uuid === collection.uuid
    );

    if (!existingFolder) {
      // 创建远程文件夹 (v2 格式)
      await this.client.createFolder(collection.name, collection.parentId || undefined);
    }

    // 同步当前集合下的请求
    for (const request of collection.requests) {
      await this.syncRequestToRemote(request, collection.uuid);
    }

    // 递归同步子集合
    for (const childCollection of collection.children) {
      await this.syncCollectionToRemote(childCollection);
    }
  }

  /**
   * 同步单个请求到远程 (v2)
   * 新格式: 使用 params, headers, bodyType, bodyContent, preScript, testScript
   */
  private async syncRequestToRemote(request: RequestItem, parentUuid: string): Promise<void> {
    try {
      // 检查远程是否已存在该API
      const remoteItems = await this.client.listDirectory(parentUuid);
      const existingApi = remoteItems.find(item =>
        this.client.isApi(item) && item.uuid === request.uuid
      );

      // 构建JSON格式字段
      const params = typeof request.request.params === 'string'
        ? request.request.params
        : JSON.stringify(request.request.params || {});

      const headers = typeof request.request.headers === 'string'
        ? request.request.headers
        : JSON.stringify(request.request.headers || {});

      const bodyContent = typeof request.request.body?.content === 'string'
        ? request.request.body.content
        : JSON.stringify(request.request.body?.content || {});

      if (existingApi) {
        // 更新现有API (v2)
        await this.client.updateApi(request.uuid || request.id, {
          method: request.request.method,
          url: request.request.url,
          params,
          headers,
          bodyType: request.request.body?.type || 'json',
          bodyContent,
          preScript: request.request.preRequestScript || '',
          testScript: request.request.testScript || '',
          sseFlag: false,
          ssePaths: '{}'
        });
      } else {
        // 创建新API (v2)
        await this.client.createApi(request.name, parentUuid || 'root', {
          method: request.request.method,
          url: request.request.url,
          params,
          headers,
          bodyType: request.request.body?.type || 'json',
          bodyContent,
          preScript: request.request.preRequestScript || '',
          testScript: request.request.testScript || '',
          sseFlag: false,
          ssePaths: '{}'
        });
      }
    } catch (error) {
      console.error(`同步请求失败 (ID: ${request.uuid}):`, error);
    }
  }
}

export const apiSyncService = new ApiSyncService();
