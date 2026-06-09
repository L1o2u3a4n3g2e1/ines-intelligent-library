import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiMic, FiBell, FiUser, FiMenu, FiX, FiLogOut,
  FiSettings, FiBookmark, FiSun, FiMoon, FiGlobe, FiEye
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { LANGUAGES } from '../../utils/constants';
import { MOCK_NOTIFICATIONS as NOTIFS } from '../../data/mockData';
import { labelForLanguage } from '../../utils/languageSupport';
import Logo from '../ui/Logo';

export default function Navbar() {
  const { user, logout, language, setLanguage, theme, setTheme, lowLiteracy, setLowLiteracy, setSidebarOpen, sidebarOpen } = useApp();
  const { t } = useTranslation(language);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [listening, setListening] = useState(false);
  const searchRef = useRef(null);
  const unread = NOTIFS.filter(n => !n.read).length;

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language === 'rw' ? 'rw-RW' : language === 'sw' ? 'sw-KE' : language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const q = e.results[0][0].transcript;
      setSearchQuery(q);
      setListening(false);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setSearchOpen(true);
  };

  const isLanding = location.pathname === '/';

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${isLanding ? 'glass' : 'bg-white/90 backdrop-blur-lg border-b border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            {user && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-ghost p-2 rounded-xl lg:hidden">
                {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            )}
            <Logo to={user ? '/dashboard' : '/'} iconSize={34} textSize="text-lg" />
          </div>

          {/* Center: nav links + search */}
          <div className="flex-1 flex items-center justify-center gap-2 mx-4">
            {!user && (
              <div className="hidden lg:flex gap-1">
                <Link to="/about" className="text-sm font-medium text-brand-700 hover:text-brand-900 px-3 py-2 rounded-lg transition-colors">About</Link>
                <Link to="/services" className="text-sm font-medium text-brand-700 hover:text-brand-900 px-3 py-2 rounded-lg transition-colors">Services</Link>
              </div>
            )}
            <div className="max-w-md hidden md:block flex-1">
              <form onSubmit={handleSearch} className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className="input-field pl-10 pr-10 py-2.5 text-sm h-10"
                />
                <button type="button" onClick={startVoiceSearch}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 hover:text-brand-600 transition-colors ${listening ? 'animate-mic' : ''}`}>
                  <FiMic size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Mobile search */}
            <button onClick={() => setSearchOpen(!searchOpen)} className="btn-ghost p-2 md:hidden">
              <FiSearch size={18} />
            </button>

            {/* Theme toggle */}
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="btn-ghost p-2 rounded-xl hidden sm:flex">
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            {/* Low literacy toggle */}
            <button onClick={() => setLowLiteracy(v => !v)}
              title={t('lowLiteracy')}
              className={`btn-ghost p-2 rounded-xl hidden sm:flex ${lowLiteracy ? 'bg-brand-500/15 text-brand-600' : ''}`}>
              <FiEye size={18} />
            </button>

            {/* Language */}
            <div className="relative">
              <button onClick={() => { setShowLang(v => !v); setShowNotifs(false); setShowProfile(false); }}
                className="btn-ghost p-2 rounded-xl flex items-center gap-1">
                <FiGlobe size={18} />
                <span className="text-xs font-semibold hidden sm:block uppercase">{language}</span>
              </button>
              <AnimatePresence>
                {showLang && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden z-60">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => { setLanguage(l.code); setShowLang(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-50 transition-colors ${language === l.code ? 'text-brand-600 font-semibold bg-brand-50' : 'text-brand-950'}`}>
                        <span className="text-lg">{l.flag}</span> {labelForLanguage(l.code, language)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button onClick={() => { setShowNotifs(v => !v); setShowProfile(false); setShowLang(false); }}
                    className="btn-ghost p-2 rounded-xl relative">
                    <FiBell size={18} />
                    {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
                  </button>
                  <AnimatePresence>
                    {showNotifs && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden z-60">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <h3 className="font-semibold text-brand-950 text-sm">{t('notifications')}</h3>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {NOTIFS.map(n => (
                            <div key={n.id} className={`px-4 py-3 border-b border-brand-50 hover:bg-brand-50 transition-colors ${!n.read ? 'bg-brand-50' : ''}`}>
                              <p className="text-sm text-brand-950">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative">
                  <button onClick={() => { setShowProfile(v => !v); setShowNotifs(false); setShowLang(false); }}
                    className="flex items-center gap-2 btn-ghost rounded-xl px-2 py-1.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-200 to-brand-500 flex items-center justify-center text-white text-sm font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-brand-950 hidden sm:block max-w-[80px] truncate">{user?.name}</span>
                  </button>
                  <AnimatePresence>
                    {showProfile && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden z-60">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="font-semibold text-brand-950 text-sm truncate">{user?.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        {[
                          { icon: FiUser, label: t('profile'), to: '/profile' },
                          { icon: FiBookmark, label: t('bookmarks'), to: '/bookmarks' },
                          { icon: FiSettings, label: t('settings'), to: '/settings' },
                        ].map(({ icon: Icon, label, to }) => (
                          <Link key={to} to={to} onClick={() => setShowProfile(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-950 hover:bg-brand-50 transition-colors">
                            <Icon size={15} className="text-brand-500" /> {label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-200">
                          <button onClick={() => { logout(); navigate('/'); setShowProfile(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                            <FiLogOut size={15} /> {t('logout')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login" className="btn-ghost text-sm px-3 py-2 hidden sm:inline-flex">{t('login')}</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">{t('register')}</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-3 md:hidden">
              <form onSubmit={handleSearch} className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search')} className="input-field pl-10 pr-10 py-2.5 text-sm" autoFocus />
                <button type="button" onClick={startVoiceSearch}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 ${listening ? 'animate-mic' : ''}`}>
                  <FiMic size={15} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
