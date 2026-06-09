import { apiRequest } from './client.js';

const reportPaths = {
  books: 'books',
  borrowing: 'borrowing',
  users: 'users',
  'voice-search': 'voice-search',
  tts: 'tts',
  activity: 'activity',
};

export function getReport(type) {
  const path = reportPaths[type];
  if (!path) throw new Error('Unknown report type');
  return apiRequest(`/reports/${path}`);
}

export function toCsv(rows = []) {
  if (!rows.length) return '';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
}
