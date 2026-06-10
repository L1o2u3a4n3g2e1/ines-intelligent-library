import { apiRequest, asQuery } from './client.js';
import { normalizeBook } from './normalizers.js';

export function listBooks(params = {}) {
  return apiRequest(`/books${asQuery(params)}`, {}, (db) => db.books).then((response) => ({
    ...response,
    data: (response.data || []).map(normalizeBook),
  }));
}

export function getBook(id) {
  return apiRequest(`/books/${id}`, {}, (db) => db.books.find((book) => String(book.id) === String(id))).then((response) => ({
    ...response,
    data: normalizeBook(response.data),
  }));
}

export function createBook(payload) {
  return apiRequest('/books', { method: 'POST', body: JSON.stringify(payload) }, payload);
}

export function updateBook(id, payload) {
  return apiRequest(`/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { id, ...payload });
}

export function archiveBook(id) {
  return apiRequest(`/books/${id}/archive`, { method: 'PATCH' }, { id });
}

export function uploadBookFile(bookId, file) {
  const payload = new FormData();
  payload.append('file', file);
  return apiRequest(`/books/${bookId}/files`, { method: 'POST', body: payload });
}

export function getBookContent(bookId) {
  return apiRequest(`/books/${bookId}/content`);
}

export function fileDownloadUrl(fileId) {
  const token = localStorage.getItem('ines_token') || '';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost/digital-library/backend'}/book-files/${fileId}/download${query}`;
}

export function fileStreamUrl(fileId) {
  const token = localStorage.getItem('ines_token') || '';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost/digital-library/backend'}/book-files/${fileId}/stream${query}`;
}
