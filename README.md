# PostABC

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

### A Powerful API Debugging Tool for Your Browser

PostABC is a Chrome/Firefox browser extension that provides API debugging capabilities similar to Postman. It runs as a DevTools panel and allows you to send HTTP requests, manage environments, and view responses including SSE (Server-Sent Events) streams.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

### Features

- **DevTools Integration** - Seamlessly integrated into browser DevTools for easy access
- **HTTP Request Builder** - Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- **Multiple Body Types** - JSON, Raw, Form-Data, and URL-Encoded request bodies
- **CORS Bypass** - Built-in CORS bypass using `declarativeNetRequest` API
- **Environment Variables** - Manage multiple environments with `{{variable}}` syntax
- **SSE Stream Support** - Real-time Server-Sent Events streaming with live updates
- **Request Collections** - Save and organize requests into collections
- **Request History** - Automatic history tracking with search functionality
- **Monaco Editor** - Professional code editor for request body and scripts
- **Pre-request Scripts** - Execute JavaScript before requests with Postman-like `pm` API
- **Test Scripts** - Write tests to validate API responses
- **cURL Import/Export** - Import from cURL commands and export requests as cURL
- **Dark Theme** - Beautiful dark UI optimized for developers

### Installation

#### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/postabc.git
cd postabc

# Install dependencies
npm install

# Build for Chrome
npm run build:chrome

# Or build for Firefox
npm run build:firefox
```

#### Load Extension Manually

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `.output/firefox-mv3` directory

### Development

```bash
# Start development server with hot reload (Chrome)
npm run dev:chrome

# Start development server with hot reload (Firefox)
npm run dev:firefox

# Type checking
npm run compile
```

### Tech Stack

- **Framework**: [WXT](https://wxt.dev/) - Modern browser extension framework
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Storage**: Dexie (IndexedDB wrapper)
- **Code Editor**: Monaco Editor
- **Build Tool**: Vite

### Project Structure

```
postabc/
├── entrypoints/
│   ├── background.ts      # Service worker for CORS bypass
│   ├── devtools.html      # DevTools panel entry
│   └── main.tsx           # React app entry
├── src/
│   ├── background/        # Background service worker logic
│   ├── components/        # React components
│   ├── core/              # Core modules (SSE, scripts)
│   ├── stores/            # Zustand state management
│   ├── storage/           # IndexedDB storage layer
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── constants/         # App constants
├── wxt.config.ts          # WXT configuration
└── package.json
```

### Usage

1. Open DevTools (F12 or Ctrl+Shift+I)
2. Find "PostABC" tab in DevTools
3. Enter your API URL and configure request
4. Click "Send" to execute the request
5. View response in the response panel

### Environment Variables

Use `{{variableName}}` syntax in URLs, headers, and request body:

```
https://{{apiHost}}/api/v1/users
Authorization: Bearer {{authToken}}
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<a name="中文"></a>
## 中文

### 强大的浏览器 API 调试工具

PostABC 是一个 Chrome/Firefox 浏览器扩展，提供类似 Postman 的 API 调试功能。它作为 DevTools 面板运行，允许您发送 HTTP 请求、管理环境变量、查看响应（包括 SSE 流）。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

### 功能特性

- **DevTools 集成** - 无缝集成到浏览器开发者工具中，方便访问
- **HTTP 请求构建器** - 支持所有 HTTP 方法（GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS）
- **多种请求体类型** - 支持 JSON、Raw、Form-Data 和 URL-Encoded 请求体
- **CORS 绑过** - 使用 `declarativeNetRequest` API 内置 CORS 跨域支持
- **环境变量** - 使用 `{{变量名}}` 语法管理多环境配置
- **SSE 流支持** - 实时 Server-Sent Events 流式响应，支持即时更新
- **请求集合** - 保存并组织请求到集合中
- **请求历史** - 自动记录历史请求，支持搜索功能
- **Monaco 编辑器** - 专业的代码编辑器，用于编辑请求体和脚本
- **预请求脚本** - 在请求前执行 JavaScript，支持 Postman 风格的 `pm` API
- **测试脚本** - 编写测试用例验证 API 响应
- **cURL 导入/导出** - 从 cURL 命令导入，导出请求为 cURL 命令
- **深色主题** - 为开发者优化的精美深色界面

### 安装

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-username/postabc.git
cd postabc

# 安装依赖
npm install

# 构建 Chrome 版本
npm run build:chrome

# 或构建 Firefox 版本
npm run build:firefox
```

#### 手动加载扩展

**Chrome:**
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3` 目录

**Firefox:**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `.output/firefox-mv3` 目录中的任意文件

### 开发

```bash
# 启动开发服务器（Chrome）- 支持热重载
npm run dev:chrome

# 启动开发服务器（Firefox）- 支持热重载
npm run dev:firefox

# 类型检查
npm run compile
```

### 技术栈

- **框架**: [WXT](https://wxt.dev/) - 现代浏览器扩展框架
- **UI**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **存储**: Dexie（IndexedDB 封装）
- **代码编辑器**: Monaco Editor
- **构建工具**: Vite

### 项目结构

```
postabc/
├── entrypoints/
│   ├── background.ts      # 用于 CORS 跨域的 Service Worker
│   ├── devtools.html      # DevTools 面板入口
│   └── main.tsx           # React 应用入口
├── src/
│   ├── background/        # 后台服务逻辑
│   ├── components/        # React 组件
│   ├── core/              # 核心模块（SSE、脚本执行）
│   ├── stores/            # Zustand 状态管理
│   ├── storage/           # IndexedDB 存储层
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── constants/         # 应用常量
├── wxt.config.ts          # WXT 配置
└── package.json
```

### 使用方法

1. 打开开发者工具（F12 或 Ctrl+Shift+I）
2. 在 DevTools 中找到 "PostABC" 标签
3. 输入 API 地址并配置请求
4. 点击"发送"执行请求
5. 在响应面板查看结果

### 环境变量

在 URL、请求头和请求体中使用 `{{变量名}}` 语法：

```
https://{{apiHost}}/api/v1/users
Authorization: Bearer {{authToken}}
```

### 贡献

欢迎贡献代码！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

---

### Acknowledgments / 致谢

- [WXT](https://wxt.dev/) - Excellent browser extension framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
