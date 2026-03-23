import type { HttpRequest } from './request';

/**
 * Request collection (文件夹/集合)
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Request folder
 */
export interface CollectionFolder {
  id: string;
  name: string;
  collectionId: string;
  parentFolderId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Collection request item
 */
export interface CollectionItem {
  id: string;
  name: string;
  request: any;
  collectionId: string;
  folderId?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Request item - 用于存储单个API请求
 */
export interface RequestItem {
  id: string;
  uuid?: string;
  name: string;
  collectionId: string | null;
  request: HttpRequest;
  createdAt: number;
  updatedAt: number;
  parentId?: string | null;
}

/**
 * Request collection - 用于存储文件夹/集合树结构
 */
export interface RequestCollection {
  uuid: string;
  name: string;
  parentId?: string | null;
  children: RequestCollection[];
  requests: RequestItem[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Collection export format
 */
export interface CollectionExport {
  version: string;
  name: string;
  description?: string;
  collections: Collection[];
  folders: CollectionFolder[];
  items: CollectionItem[];
}
