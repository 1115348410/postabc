import React from 'react';
import ReactDOM from 'react-dom/client';
import '../src/styles/globals.css';
import DevToolsPanel from '../src/components/DevToolsPanel';

// 只在浏览器环境中渲染
if (typeof window !== 'undefined' && document.getElementById('app')) {
  ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
      <DevToolsPanel />
    </React.StrictMode>
  );
}

export default DevToolsPanel;
