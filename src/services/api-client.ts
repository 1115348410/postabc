// ==================== API v2 类型定义 ====================

// API统一响应结构 (v2)
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ApiInfoDTO - 文件夹/接口基本信息 (v2)
// collectionFlag: true=文件夹, false=API接口
export interface ApiInfoDTO {
  id?: number;
  uuid: string;
  name: string;
  parentUuid: string;
  collectionFlag: boolean;
  method?: string;  // HTTP方法，仅对API接口有效
  createTime?: string;
}

// ApiInfoItemDTO - API详情信息 (v2)
export interface ApiInfoItemDTO {
  id?: number;
  uuid: string;
  method: string;
  url: string;
  params: string;       // JSON格式存储
  headers: string;      // JSON格式存储
  bodyType: string;     // 请求体类型
  bodyContent: string;  // JSON格式存储
  preScript: string;    // 前置脚本
  testScript: string;   // 请求完成后脚本
  sseFlag: boolean;     // 是否流式输出
  ssePaths: string;     // 流式输出路径表达式，JSON格式存储
}

// ApiInfoEnvDTO - 环境变量信息 (实际接口格式)
export interface ApiInfoEnvDTO {
  id: number;
  envKey: string;
  envValue: string;
}

// ==================== 兼容旧类型的别名 ====================

// 保留旧类型别名，便于过渡
/** @deprecated 使用 ApiInfoDTO 替代 */
export type ApiFolder = ApiInfoDTO;
/** @deprecated 使用 ApiInfoDTO 替代 */
export type ApiInfo = ApiInfoDTO;
/** @deprecated 使用 ApiInfoItemDTO 替代 */
export type ApiItem = ApiInfoItemDTO;
/** @deprecated 使用 ApiInfoEnvDTO 替代 */
export type ApiEnvVariable = ApiInfoEnvDTO;

// ==================== 请求类型定义 (v2) ====================

// 创建文件夹请求 (v2)
export interface CreateFolderRequest {
  apiInfoDTO: {
    uuid?: string;
    name: string;
    parentUuid?: string;
    collectionFlag: true;
  };
}

// 修改文件夹请求 (v2)
export interface UpdateFolderRequest {
  apiInfoDTO: {
    uuid: string;
    name: string;
  };
}

// 创建API请求 (v2)
export interface CreateApiRequest {
  apiInfoDTO: {
    uuid?: string;
    name: string;
    parentUuid: string;
    collectionFlag: false;
  };
  apiInfoItemDTO: {
    uuid?: string;
    method: string;
    url?: string;
    params?: string;
    headers?: string;
    bodyType?: string;
    bodyContent?: string;
    preScript?: string;
    testScript?: string;
    sseFlag?: boolean;
    ssePaths?: string;
  };
}

// 修改API请求 (v2)
export interface UpdateApiRequest {
  apiInfoItemDTO: {
    uuid: string;
    method: string;
    url?: string;
    params?: string;
    headers?: string;
    bodyType?: string;
    bodyContent?: string;
    preScript?: string;
    testScript?: string;
    sseFlag?: boolean;
    ssePaths?: string;
  };
}

// 环境变量请求 (实际接口格式)
export interface EnvVariableRequest {
  id?: number;
  envKey: string;
  envValue: string;
}

class ApiClient {
  private async getBaseUrl(): Promise<string | null> {
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
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const baseUrl = await this.getBaseUrl();
    if (!baseUrl) {
      throw new Error('未配置服务端地址，请在设置中配置');
    }

    let url = `${baseUrl}/api-info${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data: ApiResponse<T> = await response.json();

    if (data.code !== 200) {
      throw new Error(data.message || `请求失败 (code: ${data.code})`);
    }

    return data;
  }

  // ========== 文件夹操作 (v2) ==========

  /**
   * 新增文件夹
   * 如果没有父目录，默认父目录uuid为root
   */
  async createFolder(name: string, parentUuid?: string): Promise<string> {
    const request: CreateFolderRequest = {
      apiInfoDTO: {
        name,
        parentUuid: parentUuid || 'root',
        collectionFlag: true
      }
    };
    const response = await this.request<string>('POST', '/folder', request);
    return response.data;
  }

  /**
   * 修改文件夹名称
   */
  async updateFolder(uuid: string, name: string): Promise<boolean> {
    const request: UpdateFolderRequest = {
      apiInfoDTO: {
        uuid,
        name
      }
    };
    const response = await this.request<boolean>('PUT', '/folder', request);
    return response.data;
  }

  /**
   * 修改API接口名称
   * 与文件夹重命名使用同一接口
   */
  async updateApiName(uuid: string, name: string): Promise<boolean> {
    const request: UpdateFolderRequest = {
      apiInfoDTO: {
        uuid,
        name
      }
    };
    const response = await this.request<boolean>('PUT', '/folder', request);
    return response.data;
  }

  // ========== 目录列表操作 (v2) ==========

  /**
   * 查找文件夹下一级目录和接口简要信息
   * 通过UUID只查找下一级的目录或接口简要信息
   */
  async listDirectory(parentUuid?: string): Promise<ApiInfoDTO[]> {
    const params: Record<string, string> = {};
    if (parentUuid) {
      params.parentUuid = parentUuid;
    }
    const response = await this.request<ApiInfoDTO[]>('GET', '/list', undefined, params);
    return response.data;
  }

  // ========== API接口操作 (v2) ==========

  /**
   * 新增API接口
   * 父UUID即为归属文件夹
   */
  async createApi(
    name: string,
    parentUuid: string,
    apiItem: {
      method: string;
      url?: string;
      params?: string;
      headers?: string;
      bodyType?: string;
      bodyContent?: string;
      preScript?: string;
      testScript?: string;
      sseFlag?: boolean;
      ssePaths?: string;
    }
  ): Promise<string> {
    const request: CreateApiRequest = {
      apiInfoDTO: {
        name,
        parentUuid,
        collectionFlag: false
      },
      apiInfoItemDTO: {
        method: apiItem.method,
        url: apiItem.url || '',
        params: apiItem.params || '{}',
        headers: apiItem.headers || '{}',
        bodyType: apiItem.bodyType || '',
        bodyContent: apiItem.bodyContent || '{}',
        preScript: apiItem.preScript || '',
        testScript: apiItem.testScript || '',
        sseFlag: apiItem.sseFlag || false,
        ssePaths: apiItem.ssePaths || '{}'
      }
    };
    const response = await this.request<string>('POST', '/api', request);
    return response.data;
  }

  /**
   * 获取API接口详情
   */
  async getApiDetail(uuid: string): Promise<ApiInfoItemDTO> {
    const response = await this.request<ApiInfoItemDTO>('GET', '/api/detail', undefined, { uuid });
    return response.data;
  }

  /**
   * 修改API接口
   * API除uuid键以外其他内容均可修改
   */
  async updateApi(
    uuid: string,
    updates: {
      method: string;
      url?: string;
      params?: string;
      headers?: string;
      bodyType?: string;
      bodyContent?: string;
      preScript?: string;
      testScript?: string;
      sseFlag?: boolean;
      ssePaths?: string;
    }
  ): Promise<boolean> {
    const request: UpdateApiRequest = {
      apiInfoItemDTO: {
        uuid,
        method: updates.method,
        url: updates.url,
        params: updates.params,
        headers: updates.headers,
        bodyType: updates.bodyType,
        bodyContent: updates.bodyContent,
        preScript: updates.preScript,
        testScript: updates.testScript,
        sseFlag: updates.sseFlag,
        ssePaths: updates.ssePaths
      }
    };
    const response = await this.request<boolean>('PUT', '/api', request);
    return response.data;
  }

  // ========== 删除操作 ==========

  /**
   * 删除API接口或文件夹
   * 如果是文件夹会同时删除其下所有子项
   */
  async deleteItem(uuid: string): Promise<boolean> {
    const response = await this.request<boolean>('DELETE', `/${uuid}`);
    return response.data;
  }

  // ========== 环境变量操作 (v2) ==========

  /**
   * 获取所有环境变量
   */
  async getEnvVariables(): Promise<ApiInfoEnvDTO[]> {
    const response = await this.request<ApiInfoEnvDTO[]>('GET', '/env');
    return response.data;
  }

  /**
   * 新增或修改环境变量
   */
  async saveEnvVariable(request: EnvVariableRequest): Promise<boolean> {
    const response = await this.request<boolean>('POST', '/env', request);
    return response.data;
  }

  /**
   * 删除环境变量
   * @param id 环境变量ID
   */
  async deleteEnvVariable(id: number): Promise<boolean> {
    const response = await this.request<boolean>('DELETE', `/env/${id}`);
    return response.data;
  }

  // ========== 辅助方法 ==========

  /**
   * 判断是否为文件夹
   */
  isFolder(item: ApiInfoDTO): boolean {
    return item.collectionFlag === true;
  }

  /**
   * 判断是否为API接口
   */
  isApi(item: ApiInfoDTO): boolean {
    return item.collectionFlag === false;
  }
}

export const apiClient = new ApiClient();
