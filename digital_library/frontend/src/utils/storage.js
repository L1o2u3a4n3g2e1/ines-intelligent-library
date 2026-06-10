export const storage = {
  setToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  removeToken: () => localStorage.removeItem('token'),

  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  removeUser: () => localStorage.removeItem('user'),

  setLanguage: (language) => localStorage.setItem('language', language),
  getLanguage: () => localStorage.getItem('language') || 'en',

  setTheme: (theme) => localStorage.setItem('theme', theme),
  getTheme: () => localStorage.getItem('theme') || 'light',

  setAccessibilityMode: (enabled) => localStorage.setItem('accessibilityMode', enabled),
  getAccessibilityMode: () => localStorage.getItem('accessibilityMode') === 'true',

  setReadingHistory: (history) => localStorage.setItem('readingHistory', JSON.stringify(history)),
  getReadingHistory: () => {
    const history = localStorage.getItem('readingHistory');
    return history ? JSON.parse(history) : [];
  },
  addToReadingHistory: (book) => {
    const history = storage.getReadingHistory();
    const exists = history.find(b => b.id === book.id);
    if (!exists) {
      history.unshift({ ...book, readAt: new Date().toISOString() });
      if (history.length > 50) history.pop();
      storage.setReadingHistory(history);
    }
  },

  setBookmarks: (bookmarks) => localStorage.setItem('bookmarks', JSON.stringify(bookmarks)),
  getBookmarks: () => {
    const bookmarks = localStorage.getItem('bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
  },
  addBookmark: (book) => {
    const bookmarks = storage.getBookmarks();
    if (!bookmarks.find(b => b.id === book.id)) {
      bookmarks.push({ ...book, bookmarkedAt: new Date().toISOString() });
      storage.setBookmarks(bookmarks);
    }
  },
  removeBookmark: (bookId) => {
    const bookmarks = storage.getBookmarks();
    storage.setBookmarks(bookmarks.filter(b => b.id !== bookId));
  },

  setDownloads: (downloads) => localStorage.setItem('downloads', JSON.stringify(downloads)),
  getDownloads: () => {
    const downloads = localStorage.getItem('downloads');
    return downloads ? JSON.parse(downloads) : [];
  },

  clear: () => localStorage.clear()
};

export default storage;
