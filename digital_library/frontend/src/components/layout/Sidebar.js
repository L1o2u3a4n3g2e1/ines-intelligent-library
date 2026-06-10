import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiSearch, FiUpload, FiBookmark, FiClock, FiHeadphones,
  FiSettings, FiLogOut, FiX, FiShield
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import Logo from '../ui/Logo';

const NAV_ITEMS = [
  { icon: FiGrid, key: 'dashboard', to: '/dashboard', emoji: '🏠' },
  { icon: FiSearch, key: 'books', to: '/search', emoji: '🔍' },
  { icon: FiUpload, key: 'upload', to: '/upload', emoji: '📤' },
  { icon: FiBookmark, key: 'bookmarks', to: '/bookmarks', emoji: '🔖' },
  { icon: FiClock, key: 'history', to: '/history', emoji: '🕐' },
  { icon: FiHeadphones, key: 'audio', to: '/audio', emoji: '🎧' },
];

const BOTTOM_ITEMS = [
  { icon: FiShield, key: 'admin', to: '/admin' },
  { icon: FiSettings, key: 'settings', to: '/settings' },
];

export default function Sidebar() {
  const { language, logout, sidebarOpen, setSidebarOpen, user, lowLiteracy, speakHint } = useApp();
  const { t } = useTranslation(language);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo area */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-brand-100">
        <Logo to="/dashboard" iconSize={32} textSize="text-base" />
        <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5 rounded-lg lg:hidden">
          <FiX size={18} />
        </button>
      </div>

      {/* User mini card */}
      {user && (
        <div className="mx-4 my-4 p-3 rounded-2xl bg-gradient-to-r from-brand-50 to-brand-100 border border-brand-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-200 to-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-950 truncate">{user?.name}</p>
              <p className="text-xs text-brand-500">{t('avidReader')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Low Literacy voice banner */}
      {lowLiteracy && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-brand-600/10 border border-brand-200 flex items-center gap-2">
          <span className="text-lg">🔊</span>
          <p className="text-xs text-brand-800 font-medium">{t('hoverToHear')}</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, key, to, emoji }) => (
          <NavLink key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={() => speakHint(t(key))}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 rounded-2xl font-medium transition-all duration-200 group
              ${lowLiteracy ? 'py-4 text-base' : 'py-3 text-sm'}
              ${isActive
                ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.35)]'
                : 'text-brand-800 hover:bg-brand-50 hover:text-brand-600'
              }`
            }>
            {({ isActive }) => (
              <>
                {lowLiteracy
                  ? <span className="text-xl">{emoji}</span>
                  : <Icon size={18} className={isActive ? 'text-white' : 'text-brand-500 group-hover:text-brand-600'} />
                }
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="px-3 pb-4 space-y-1 border-t border-brand-100 pt-3">
        {BOTTOM_ITEMS.map(({ icon: Icon, key, to }) => (
          <NavLink key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200
              ${isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-brand-50 hover:text-brand-600'}`
            }>
            <Icon size={17} className="text-gray-400" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200">
          <FiLogOut size={17} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm" />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-64 z-50 lg:hidden shadow-2xl">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
