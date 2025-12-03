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

export default API_BASE_URL;
