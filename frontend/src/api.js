import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getProducts = async () => {
  const { data } = await api.get('/products');
  return Array.isArray(data) ? data : [];
};

export const searchProducts = async (query) => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];

  const { data } = await api.get('/products/search', {
    params: { q: cleanQuery }
  });

  return Array.isArray(data) ? data : [];
};

export const trackProduct = async (payload) => {
  const { data } = await api.post('/products', payload);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const getProductHistory = async (id) => {
  const { data } = await api.get(`/products/${id}/history`);
  return Array.isArray(data) ? data : [];
};

export const getProductLogs = async (id) => {
  const { data } = await api.get(`/products/${id}/logs`);
  return Array.isArray(data) ? data : [];
};

export default api;
