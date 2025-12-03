// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const getApiUrl = (path) => {
  // In development, use relative paths (proxy handles it)
  // In production, use the full backend URL
  if (process.env.NODE_ENV === 'production' && API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
};

// Global fetch wrapper that automatically uses the correct API URL
export const apiFetch = (path, options = {}) => {
  const url = getApiUrl(path);
  
  // Add authorization header if token exists
  const token = localStorage.getItem('authToken');
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export default API_BASE_URL;
