import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { getApiUrl } from './config/api';

// Monkey patch fetch to automatically use backend URL in production
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  // Only patch relative API URLs
  if (typeof url === 'string' && url.startsWith('/api/')) {
    url = getApiUrl(url);
    
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }
  
  return originalFetch(url, options);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
