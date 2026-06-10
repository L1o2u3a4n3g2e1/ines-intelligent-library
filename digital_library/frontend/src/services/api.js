import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const http = axios.create({ baseURL: `${BASE}/api`, timeout: 15000 });

http.interceptors.request.use(cfg => {
  const t = localStorage.getItem('ml_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

http.interceptors.response.use(r => r.data, err => {
  const msg = err.response?.data?.message || err.message || 'Network error';
  return Promise.reject(new Error(msg));
});

export const authService = {
  login: (email, password) => http.post('/auth/login', { email, password }),
  register: (name, email, password) => http.post('/auth/register', { name, email, password }),
  me: () => http.get('/auth/me'),
};

export const bookService = {
  list: (params) => http.get('/books', { params }),
  get: (id) => http.get(`/books/${id}`),
  create: (data) => http.post('/books', data),
  update: (id, data) => http.put(`/books/${id}`, data),
  delete: (id) => http.delete(`/books/${id}`),
  search: (q, params) => http.get('/books/search', { params: { q, ...params } }),
  recommend: () => http.get('/books/recommended'),
};

export const uploadService = {
  book: (formData, onProgress) => http.post('/upload/book', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }),
  cover: (formData) => http.post('/upload/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const translationService = {
  translate: (text, from, to) => http.post('/translate', { text, from, to }),
  languages: () => http.get('/translate/languages'),
};

export const audioService = {
  generate: (bookId, lang) => http.post('/audio/generate', { bookId, lang }),
  get: (bookId) => http.get(`/audio/${bookId}`),
};

export const statsService = {
  get: () => http.get('/stats'),
  logRead: (bookId, minutes) => http.post('/stats/read', { bookId, minutes }),
};

export default http;
