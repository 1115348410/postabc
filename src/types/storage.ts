/**
 * Storage keys used in the extension
 */
export enum StorageKey {
  // Settings
  SETTINGS = 'postabc:settings',

  // Environment
  ENVIRONMENTS = 'postabc:environments',
  ACTIVE_ENVIRONMENT = 'postabc:active_environment',

  // Collections
  COLLECTIONS = 'postabc:collections',
  COLLECTION_FOLDERS = 'postabc:collection_folders',
  COLLECTION_ITEMS = 'postabc:collection_items',

  // History
  HISTORY = 'postabc:history',

  // Theme
  THEME = 'postabc:theme',
}

/**
 * Extension settings
 */
export interface Settings {
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  autoFormatJson: boolean;
  prettyPrintJson: boolean;
  showTimestamps: boolean;
  maxHistoryItems: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 'medium',
  autoFormatJson: true,
  prettyPrintJson: true,
  showTimestamps: true,
  maxHistoryItems: 100,
};
