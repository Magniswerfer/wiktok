import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { initPerformanceMonitoring } from './lib/performance';
import './styles.css';

// Initialize performance monitoring in development
if (import.meta.env.DEV) {
  initPerformanceMonitoring();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
