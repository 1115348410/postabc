# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PostABC is a Chrome/Firefox browser extension that provides API debugging capabilities similar to Postman. It runs as a DevTools panel and allows users to send HTTP requests, manage environments, and view responses including SSE streams.

## Build Commands

```bash
# Development (with hot reload)
npm run dev           # Default browser
npm run dev:chrome    # Chrome specifically
npm run dev:firefox   # Firefox specifically

# Production build
npm run build         # Default browser
npm run build:chrome  # Chrome specifically
npm run build:firefox # Firefox specifically

# Type checking
npm run compile       # TypeScript type check without emit
```

## Architecture

### Extension Structure (WXT Framework)

This project uses [WXT](https://wxt.dev/) framework for browser extension development. Key files:

- `entrypoints/background.ts` - Service worker handling CORS bypass and proxy requests
- `entrypoints/devtools.html` + `entrypoints/main.tsx` - DevTools panel UI entry point
- `wxt.config.ts` - Extension manifest and WXT configuration

### Core Components

**Background Service Worker** (`src/background/`)
- `proxy-handler.ts` - Handles HTTP requests with CORS bypass using `declarativeNetRequest` API
- Executes requests on behalf of the DevTools panel to bypass CORS restrictions

**DevTools Panel** (`src/components/`)
- `DevToolsPanel.tsx` - Main panel component with request builder and response viewer
- `request-builder/` - Editors for URL params, headers, body, and scripts
- `response-viewer/` - Response display with support for JSON, text, and SSE streams

**State Management** (`src/stores/`)
- Uses Zustand with devtools middleware
- `useDevToolsStore` - Combined store for request/response state

**Storage** (`src/storage/`)
- IndexedDB via Dexie for persistent storage
- Stores: request history, collections, environment variables

**Core Modules** (`src/core/`)
- `sse/` - SSE (Server-Sent Events) stream parsing and handling
- `script/` - Sandbox for executing pre-request and test scripts

### Data Flow

1. User enters request in DevTools panel
2. Panel sends message to background service worker via `chrome.runtime.sendMessage`
3. Background worker executes request using `fetch` with CORS bypass rules
4. Response returned to panel for display
5. Request saved to IndexedDB history

### Type System

All TypeScript types are in `src/types/`:
- `request.ts` - Request configuration types (method, headers, body, etc.)
- `response.ts` - Response data and history types
- `script.ts` - Script execution context and PM-style API types
- `sse.ts` - SSE event types
- `environment.ts` - Environment variable types
- `collection.ts` - Request collection types

## Key Patterns

### Chrome Extension Messaging

Use `sendMessageToBackground()` from `src/utils/chrome.ts` to communicate with the background service worker:

```typescript
import { sendMessageToBackground } from '@/utils/chrome';

const result = await sendMessageToBackground<ResponseType>('MESSAGE_TYPE', payload);
```

### Variable Substitution

Environment variables use `{{variableName}}` syntax. Use `replaceVariables()` from proxy-handler or variable utility.

### Styling

- Tailwind CSS with custom dark theme colors defined in `tailwind.config.ts`
- Dark mode is default (`darkMode: 'class'`)
- Custom colors: `primary`, `success`, `danger`, `warning`, and extended `gray` scale

## Extension Permissions

- `storage` - For storing extension data
- `declarativeNetRequest` - For CORS bypass
- `<all_urls>` host permissions - For making requests to any URL

## Development Notes

- The extension appears as "PostABC" in browser DevTools
- Monaco Editor is used for code editing (JSON body, scripts)
- Pre-request and test scripts support a Postman-like `pm` API
