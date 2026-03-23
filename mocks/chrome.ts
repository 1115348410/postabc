// Mock for Chrome extension APIs during build process
// This file is used by WXT to provide mock implementations during build

// @ts-ignore - browser is provided by WebExtension polyfill
if (typeof browser !== 'undefined') {
  // @ts-ignore
  if (!browser.runtime) {
    // @ts-ignore
    browser.runtime = {};
  }

  // @ts-ignore
  if (!browser.runtime.onConnect) {
    // @ts-ignore
    browser.runtime.onConnect = {
      addListener: () => {
        // No-op for build process
      }
    };
  }
}

// Also mock chrome.runtime if it doesn't exist
if (typeof chrome !== 'undefined') {
  if (!chrome.runtime) {
    (chrome as any).runtime = {};
  }

  if (!chrome.runtime.onConnect) {
    (chrome.runtime as any).onConnect = {
      addListener: () => {
        // No-op for build process
      }
    };
  }
}
