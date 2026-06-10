import { apiRequest, asQuery } from './client.js';
import { normalizeBook } from './normalizers.js';

export function searchBooks(params = {}) {
  return apiRequest(`/search/books${asQuery(params)}`).then((response) => ({
    ...response,
    data: {
      results: (response.data?.results || []).map(normalizeBook),
      parsedQuery: response.data?.parsed_query || null,
    },
  }));
}
