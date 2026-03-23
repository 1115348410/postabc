// Mock browser.runtime.onConnect API to fix build issue
// This is only for the build process and won't be included in the final extension

// @ts-ignore - browser is a global WebExtension polyfill
const browserGlobal = typeof browser !== 'undefined' ? browser : undefined;

// Create a mock for browser.runtime.onConnect
if (browserGlobal) {
  if (!browserGlobal.runtime) {
    (browserGlobal as any).runtime = {};
  }

  if (!browserGlobal.runtime.onConnect) {
    (browserGlobal.runtime as any).onConnect = {
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
