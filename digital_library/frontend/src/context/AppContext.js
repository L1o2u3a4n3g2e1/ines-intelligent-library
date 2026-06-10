import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AppContext = createContext();

const getLS = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const setLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => getLS('ml_user', null));
  const [token, setToken] = useState(() => localStorage.getItem('ml_token') || null);
  const [language, setLanguage] = useState(() => localStorage.getItem('ml_lang') || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('ml_theme') || 'light');
  const [lowLiteracy, setLowLiteracy] = useState(() => getLS('ml_low_literacy', false));
  const [highContrast, setHighContrast] = useState(() => getLS('ml_high_contrast', false));
  const [bookmarks, setBookmarks] = useState(() => getLS('ml_bookmarks', []));
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { localStorage.setItem('ml_lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('ml_theme', theme); document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => { setLS('ml_low_literacy', lowLiteracy); document.body.classList.toggle('low-literacy', lowLiteracy); }, [lowLiteracy]);
  useEffect(() => { setLS('ml_high_contrast', highContrast); document.body.classList.toggle('high-contrast', highContrast); }, [highContrast]);
  useEffect(() => { setLS('ml_bookmarks', bookmarks); }, [bookmarks]);

  const login = useCallback((userData, authToken) => {
    setUser(userData); setToken(authToken);
    setLS('ml_user', userData); localStorage.setItem('ml_token', authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null); setToken(null);
    localStorage.removeItem('ml_user'); localStorage.removeItem('ml_token');
  }, []);

  const toggleBookmark = useCallback((book) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.id === book.id);
      return exists ? prev.filter(b => b.id !== book.id) : [...prev, book];
    });
  }, []);

  const isBookmarked = useCallback((id) => bookmarks.some(b => b.id === id), [bookmarks]);

  const addNotification = useCallback((msg, type = 'info') => {
    const n = { id: Date.now(), message: msg, type, read: false, time: new Date() };
    setNotifications(prev => [n, ...prev].slice(0, 20));
  }, []);

  const speakHint = useCallback((text) => {
    if (!lowLiteracy || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, [lowLiteracy]);

  return (
    <AppContext.Provider value={{
      user, setUser, login, logout, token,
      language, setLanguage,
      theme, setTheme,
      lowLiteracy, setLowLiteracy,
      highContrast, setHighContrast,
      bookmarks, toggleBookmark, isBookmarked,
      notifications, setNotifications, addNotification,
      sidebarOpen, setSidebarOpen,
      speakHint,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
