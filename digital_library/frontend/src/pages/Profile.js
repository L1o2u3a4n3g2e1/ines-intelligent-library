import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiBookOpen, FiHeadphones, FiBookmark, FiStar, FiCamera, FiEye, FiMoon, FiSun } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { MOCK_BOOKS, MOCK_STATS } from '../data/mockData';
import { LANGUAGES } from '../utils/constants';

const BADGE_KEYS = [
  { icon: '📚', tKey: 'badge_firstBook',    earned: true  },
  { icon: '🔥', tKey: 'badge_streak7',      earned: true  },
  { icon: '🌍', tKey: 'badge_bilingual',    earned: true  },
  { icon: '🎧', tKey: 'badge_audioListener',earned: true  },
  { icon: '📝', tKey: 'badge_10books',      earned: false },
  { icon: '⭐', tKey: 'badge_topReader',    earned: false },
  { icon: '🌟', tKey: 'badge_streak30',     earned: false },
  { icon: '🏆', tKey: 'badge_master',       earned: false },
];

const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50'}`}>
    {children}
  </button>
);

export default function Profile() {
  const { user, language, setLanguage, theme, setTheme, lowLiteracy, setLowLiteracy, highContrast, setHighContrast, bookmarks } = useApp();
  const { t } = useTranslation(language);
  const [tab, setTab] = useState('activity');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || 'Reader');

  const recentBooks = MOCK_BOOKS.filter(b => b.progress > 0);

  const TABS = [
    ['activity', `📊 ${t('activityTab')}`],
    ['settings', `⚙️ ${t('settings')}`],
    ['badges',   `🏆 ${t('achievementsLabel')}`],
  ];

  const TOGGLES = [
    { key: 'theme',       icon: theme === 'dark' ? FiMoon : FiSun, label: t('darkMode'),    desc: t('darkModeDesc'),        value: theme === 'dark',  toggle: () => setTheme(th => th === 'dark' ? 'light' : 'dark') },
    { key: 'lowLiteracy', icon: FiEye,                              label: t('lowLiteracy'), desc: t('lowLiteracyModeDesc'), value: lowLiteracy,        toggle: () => setLowLiteracy(v => !v) },
    { key: 'highContrast',icon: FiEye,                              label: t('highContrast'),desc: t('highContrastDesc'),    value: highContrast,       toggle: () => setHighContrast(v => !v) },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Profile header card */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="card p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-200 to-brand-600 flex items-center justify-center text-white text-4xl font-['Playfair_Display'] font-bold shadow-card">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute inset-0 rounded-3xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <FiCamera size={20} className="text-white" />
              </div>
            </div>

            {/* Name & stats */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                {editing ? (
                  <input value={name} onChange={e => setName(e.target.value)} onBlur={() => setEditing(false)} autoFocus
                    className="input-field py-1 px-3 text-lg font-bold max-w-[200px]" />
                ) : (
                  <h1 className="text-2xl font-['Playfair_Display'] font-bold text-brand-950">{name}</h1>
                )}
                <button onClick={() => setEditing(v => !v)} className="text-gray-400 hover:text-brand-600 transition-colors"><FiEdit2 size={15} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{user?.email}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                {[
                  { icon: FiBookOpen,   value: MOCK_STATS.booksRead,           label: t('booksRead')     },
                  { icon: FiHeadphones, value: `${MOCK_STATS.listeningHours}h`, label: t('listened')      },
                  { icon: FiBookmark,   value: bookmarks.length,               label: t('bookmarks')     },
                  { icon: FiStar,       value: `${MOCK_STATS.streak}d`,         label: t('streak')        },
                ].map(({ icon: Icon, value, label }, i) => (
                  <div key={i} className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Icon size={14} className="text-brand-500" />
                      <span className="font-bold text-brand-950 text-lg font-['Playfair_Display']">{value}</span>
                    </div>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Level badge */}
            <div className="text-center">
              <div className="px-4 py-2 bg-gradient-to-r from-brand-100 to-brand-200 rounded-2xl border border-brand-400">
                <p className="text-xs text-brand-600 font-medium">{t('levelLabel')}</p>
                <p className="font-['Playfair_Display'] font-bold text-brand-950">{MOCK_STATS.level}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-brand-100 overflow-x-auto">
          {TABS.map(([v, l]) => (
            <TabBtn key={v} active={tab === v} onClick={() => setTab(v)}>{l}</TabBtn>
          ))}
        </div>

        {/* Tab content */}
        <AnimatedTab active={tab === 'activity'}>
          <div className="space-y-6">
            {/* Weekly chart */}
            <div className="card p-6">
              <h3 className="section-title text-base mb-5">{t('readingThisWeek')}</h3>
              <div className="flex items-end gap-2 h-28">
                {MOCK_STATS.weeklyReadingMinutes.map((mins, i) => {
                  const days = t('daysShort');
                  const max = Math.max(...MOCK_STATS.weeklyReadingMinutes);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(mins / max) * 96}px` }}
                        transition={{ delay: i * 0.06, duration: 0.5 }}
                        className="w-full rounded-t-lg min-h-[4px]"
                        style={{ background: i === 6 ? 'var(--brand-600)' : 'linear-gradient(to top, var(--brand-500), var(--brand-200))' }} />
                      <span className="text-[10px] text-gray-400">{days[i].charAt(0)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-center text-gray-500 mt-3">{t('avgLabel')} <strong className="text-brand-600">41 {t('minPerDay')}</strong></p>
            </div>

            {/* Recent books */}
            <div className="card p-6">
              <h3 className="section-title text-base mb-4">{t('recentlyRead')}</h3>
              <div className="space-y-3">
                {recentBooks.map((book) => (
                  <div key={book.id} className="flex items-center gap-4">
                    <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-brand-200">
                      {book.cover && <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-950 truncate">{book.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-brand-100 rounded-full"><div className="h-full bg-brand-600 rounded-full" style={{ width: `${book.progress}%` }} /></div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{book.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedTab>

        <AnimatedTab active={tab === 'settings'}>
          <div className="card p-6 space-y-6">
            <h3 className="section-title text-base">{t('preferencesLabel')}</h3>

            {/* Language */}
            <div>
              <label className="text-sm font-medium text-brand-800 mb-3 block">{t('preferredLanguage')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all
                      ${language === l.code ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-brand-200 text-brand-800 hover:border-brand-500'}`}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              {TOGGLES.map(({ key, icon: Icon, label, desc, value, toggle }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-brand-50 border border-brand-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center"><Icon size={16} className="text-brand-500" /></div>
                    <div>
                      <p className="text-sm font-medium text-brand-950">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <button onClick={toggle} className={`w-12 h-6 rounded-full relative transition-all duration-200 ${value ? 'bg-brand-600' : 'bg-brand-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AnimatedTab>

        <AnimatedTab active={tab === 'badges'}>
          <div className="card p-6">
            <h3 className="section-title text-base mb-5">{t('achievementsLabel')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {BADGE_KEYS.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                  className={`card p-4 text-center ${b.earned ? '' : 'opacity-40 grayscale'}`}>
                  <span className="text-3xl">{b.icon}</span>
                  <p className="text-xs font-medium text-brand-950 mt-2">{t(b.tKey)}</p>
                  {b.earned && <span className="text-xs text-brand-500 mt-1 block">{t('earnedLabel')}</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedTab>
      </div>
    </MainLayout>
  );
}

function AnimatedTab({ active, children }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
