import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    define: {
      // 定义一个全局变量来标识是否在构建环境中
      'process.env.BUILD_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  }),
  manifest: {
    name: 'PostABC',
    version: '1.0.0',
    description: 'API 调试浏览器插件 - 类似 Postman',
    permissions: ['storage', 'declarativeNetRequest', 'tabs'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html',
      default_title: 'PostABC API 调试工具'
    },
    devtools_page: 'devtools.html',
    // WXT 会自动从 entrypoints/background.ts 生成 background service worker
    // 不需要手动配置
  },
});