import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { RequestConfig, ResponseData, RequestTab } from '../types';

// Generate unique tab ID
const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create default tab
const createDefaultTab = (): RequestTab => ({
  id: generateTabId(),
  name: '新增API请求',
  isNew: true,
  isModified: false,
  request: {
    method: 'GET',
    url: '',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Accept', value: '*/*', enabled: true },
    ],
    queryParams: [],
    bodyType: 'none',
    timeout: 30000,
    streamConfig: {
      enabled: false,
      extractionRules: [],
      displayMode: 'concatenated',
    },
  },
});

// Request Store
interface RequestState {
  currentRequest: RequestConfig | null;
  isSending: boolean;
  abortController: AbortController | null;
  setCurrentRequest: (request: RequestConfig | null) => void;
  setIsSending: (sending: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  cancelRequest: () => void;
  
  // Tab state
  tabs: RequestTab[];
  activeTabId: string | null;
  addTab: (tab?: Partial<RequestTab>) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<RequestTab>) => void;
  updateTabRequest: (tabId: string, request: RequestConfig) => void;
  updateTabResponse: (tabId: string, response: any) => void;
  getActiveTab: () => RequestTab | null;
}

export const useRequestStore = create<RequestState>()(
  devtools(
    (set, get) => ({
      currentRequest: null,
      isSending: false,
      abortController: null,
      setCurrentRequest: (request) => set({ currentRequest: request }),
      setIsSending: (sending) => set({ isSending: sending }),
      setAbortController: (controller) => set({ abortController: controller }),
      cancelRequest: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set({ isSending: false, abortController: null });
        }
      },
      // Tab state - 启动时不创建默认tab
      tabs: [],
      activeTabId: null,
      addTab: (tab) => {
        const { tabs } = get();
        const newTab: RequestTab = {
          ...createDefaultTab(),
          ...(tab || {}),
          id: generateTabId(),
          name: tab?.name || '新增API请求',
        };
        set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
      },
      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const newTabs = tabs.filter((t) => t.id !== tabId);
        if (newTabs.length === 0) {
          // 如果没有标签页了，直接设置为空，不创建默认标签页
          set({ tabs: [], activeTabId: null });
        } else {
          // Switch to another tab if closing active tab
          const newActiveId = activeTabId === tabId ? newTabs[newTabs.length - 1].id : activeTabId;
          set({ tabs: newTabs, activeTabId: newActiveId });
        }
      },
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateTab: (tabId, updates) => {
        const { tabs } = get();
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, ...updates } : t
        );
        set({ tabs: newTabs });
      },
      updateTabRequest: (tabId, request) => {
        const { tabs } = get();
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, request, isModified: true } : t
        );
        set({ tabs: newTabs });
      },
      updateTabResponse: (tabId, response) => {
        const { tabs } = get();
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, response } : t
        );
        set({ tabs: newTabs });
      },
      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
      },
    }),
    { name: 'RequestStore' }
  )
);

// Response Store
interface ResponseState {
  currentResponse: ResponseData | null;
  responseLogs: ResponseData['logs'];
  setResponse: (response: ResponseData | null) => void;
  addResponseLog: (log: ResponseData['logs'][0]) => void;
  clearResponseLogs: () => void;
}

export const useResponseStore = create<ResponseState>()(
  devtools(
    (set) => ({
      currentResponse: null,
      responseLogs: [],
      setResponse: (response) => set({ currentResponse: response }),
      addResponseLog: (log) =>
        set((state) => ({
          responseLogs: [...state.responseLogs, log],
        })),
      clearResponseLogs: () => set({ responseLogs: [] }),
    }),
    { name: 'ResponseStore' }
  )
);

// Combined Store for DevTools Panel
interface DevToolsState extends RequestState, ResponseState {
  serverBaseUrl: string | null;
  setServerBaseUrl: (baseUrl: string | null) => void;
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  cancelRequest: () => void;
}

export const useDevToolsStore = create<DevToolsState>()(
  devtools(
    (set, get) => ({
      currentRequest: null,
      isSending: false,
      currentResponse: null,
      responseLogs: [],
      serverBaseUrl: null,
      abortController: null,
      setCurrentRequest: (request) => set({ currentRequest: request }),
      setIsSending: (sending) => set({ isSending: sending }),
      setResponse: (response) => set({ currentResponse: response }),
      addResponseLog: (log) =>
        set((state) => ({
          responseLogs: [...state.responseLogs, log],
        })),
      clearResponseLogs: () => set({ responseLogs: [] }),
      setServerBaseUrl: (baseUrl) => set({ serverBaseUrl: baseUrl }),
      setAbortController: (controller) => set({ abortController: controller }),
      cancelRequest: () => {
        const state = get();
        if (state.abortController) {
          state.abortController.abort();
          set({ isSending: false, abortController: null });
        }
      },
      // Tab state (sync with RequestStore) - 启动时不创建默认tab
      tabs: [],
      activeTabId: null,
      addTab: (tab) => {
        const state = get();
        const tabs = state.tabs || [];
        const newTab: RequestTab = {
          ...createDefaultTab(),
          ...(tab || {}),
          id: generateTabId(),
          name: tab?.name || '新增API请求',
        };
        set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
      },
      closeTab: (tabId) => {
        const state = get();
        const tabs = state.tabs || [];
        const activeTabId = state.activeTabId;
        const newTabs = tabs.filter((t) => t.id !== tabId);
        if (newTabs.length === 0) {
          // 如果没有标签页了，直接设置为空，不创建默认标签页
          set({ tabs: [], activeTabId: null });
        } else {
          const newActiveId = activeTabId === tabId ? newTabs[newTabs.length - 1].id : activeTabId;
          set({ tabs: newTabs, activeTabId: newActiveId });
        }
      },
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateTab: (tabId, updates) => {
        const state = get();
        const tabs = state.tabs || [];
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, ...updates } : t
        );
        set({ tabs: newTabs });
      },
      updateTabRequest: (tabId, request) => {
        const state = get();
        const tabs = state.tabs || [];
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, request, isModified: true } : t
        );
        set({ tabs: newTabs });
      },
      updateTabResponse: (tabId, response) => {
        const state = get();
        const tabs = state.tabs || [];
        const newTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, response } : t
        );
        set({ tabs: newTabs });
      },
      getActiveTab: () => {
        const state = get();
        const tabs = state.tabs || [];
        const activeTabId = state.activeTabId;
        return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
      },
    }),
    { name: 'DevToolsStore' }
  )
);
