import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrendingUp, FiClock, FiBookOpen, FiHeadphones, FiArrowRight, FiMic, FiZap, FiSearch } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import BookCard from '../components/books/BookCard';
import AudioPlayer from '../components/audio/AudioPlayer';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { MOCK_BOOKS, MOCK_STATS, SAMPLE_TEXT } from '../data/mockData';
import { CATEGORIES } from '../utils/constants';
import { bookService, statsService } from '../services/api';

const StatCard = ({ icon: Icon, value, label, color }) => (
  <motion.div whileHover={{ y: -3 }} className="card p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div>
      <p className="text-2xl font-bold font-['Playfair_Display'] text-brand-950">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

const SectionHeader = ({ title, to, icon: Icon }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-brand-500" />}
      <h2 className="section-title">{title}</h2>
    </div>
    {to && (
      <Link to={to} className="flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors">
        See all <FiArrowRight size={14} />
      </Link>
    )}
  </div>
);

// All category IDs that have at least one book in current data
const USED_CATEGORIES = ['all', 'fiction', 'history', 'health', 'agriculture', 'business', 'education', 'science'];

export default function Dashboard() {
  const { user, language } = useApp();
  const { t } = useTranslation(language);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [stats, setStats] = useState(MOCK_STATS);

  useEffect(() => {
    bookService.list().then(data => { if (data?.length) setBooks(data); }).catch(() => {});
    statsService.get().then(data => { if (data) setStats(data); }).catch(() => {});
    bookService.recommend().then(data => {
      if (data?.length) setBooks(prev => [...data, ...prev.filter(b => !data.find(d => d.id === b.id))]);
    }).catch(() => {});
  }, []);

  const inProgress    = books.filter(b => b.progress > 0 && b.progress < 100);
  const audioBooks    = books.filter(b => b.hasAudio).slice(0, 4);
  const trending      = [...books].sort((a, b) => b.readers - a.readers).slice(0, 6);

  // Category-filtered books
  const filteredBooks = activeCategory === 'all'
    ? books
    : books.filter(b => b.category === activeCategory);

  // Categories that actually have books
  const availableCategories = CATEGORIES.filter(c => USED_CATEGORIES.includes(c.id));
  const activeCategoryLabel = activeCategory === 'all'
    ? t('allBooks')
    : availableCategories.find(c => c.id === activeCategory)?.label || t('books');

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-10">

        {/* Welcome header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-['Playfair_Display'] font-bold text-brand-950">
              {t('welcome')}, {user?.name?.split(' ')[0] || 'Reader'} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {t('youveRead')} <strong className="text-brand-600">{stats.booksRead} {t('bookPlural')}</strong>{t('keepGoing')}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/search')}
              className="btn-ghost flex items-center gap-2 text-sm border border-brand-200">
              <FiMic size={15} /> {t('voiceSearchBtn')}
            </button>
            <Link to="/upload" className="btn-primary text-sm">{t('uploadBtn')}</Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FiBookOpen}   value={stats.booksRead}           label={t('booksRead')}       color="var(--brand-600)" />
          <StatCard icon={FiHeadphones} value={`${stats.listeningHours}h`} label={t('listeningTime')}   color="var(--audio-600)" />
          <StatCard icon={FiZap}        value={`${stats.streak}d`}         label={t('streak')}           color="var(--brand-500)" />
          <StatCard icon={FiTrendingUp} value="78%"                        label={t('readingProgress')} color="var(--lang-600)" />
        </div>

        {/* Continue Reading */}
        {inProgress.length > 0 && (
          <section>
            <SectionHeader title={t('continueReading')} to="/history" icon={FiClock} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((book, i) => (
                <motion.div key={book.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3 }}
                  className="card flex items-center gap-4 p-4 cursor-pointer group"
                  onClick={() => navigate(`/read/${book.id}`)}>
                  <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-brand-100">
                    {book.cover && <img src={book.cover} alt={book.title} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-950 text-sm truncate group-hover:text-brand-600 transition-colors">{book.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
                    <div className="mt-2.5">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{t('progress')}</span><span>{book.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-brand-100 rounded-full">
                        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full" style={{ width: `${book.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── BROWSE BY CATEGORY ── */}
        <section>
          <SectionHeader title={t('browseByCategory')} to="/search" icon={FiBookOpen} />

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${activeCategory === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-brand-200 text-brand-800 hover:border-brand-500 hover:bg-brand-50'}`}>
              📚 {t('allBooks')}
            </button>
            {availableCategories.map(c => (
              <button key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${activeCategory === c.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border border-brand-200 text-brand-800 hover:border-brand-500 hover:bg-brand-50'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Filtered book grid */}
          <AnimatePresence mode="wait">
            <motion.div key={activeCategory}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}>
              {filteredBooks.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      <strong className="text-brand-950">{filteredBooks.length}</strong> {filteredBooks.length !== 1 ? t('bookPlural') : t('bookSingular')} {t('inCat')} <span className="text-brand-600 font-medium">{activeCategoryLabel}</span>
                    </p>
                    <Link to={`/search${activeCategory !== 'all' ? `?category=${activeCategory}` : ''}`}
                      className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">
                      <FiSearch size={12} /> {t('searchInCategory')}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredBooks.map((book, i) => (
                      <BookCard key={book.id} book={book} index={i} layout="grid" />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-14 text-gray-400">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="font-medium text-brand-950">{t('noBooksYet')}</p>
                  <Link to="/upload" className="btn-primary text-sm mt-4 inline-flex">{t('uploadFirstBook')}</Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Trending */}
        <section>
          <SectionHeader title={t('trending')} to="/search" icon={FiTrendingUp} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {trending.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
        </section>

        {/* Audiobooks + Player */}
        <section>
          <SectionHeader title={t('audiobooks')} to="/search?hasAudio=true" icon={FiHeadphones} />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {audioBooks.map((book, i) => <BookCard key={book.id} book={book} index={i} layout="list" />)}
            </div>
            <div>
              <AudioPlayer text={SAMPLE_TEXT} lang={language} />
            </div>
          </div>
        </section>

        {/* Weekly activity */}
        <section>
          <SectionHeader title={t('weeklyActivity')} />
          <div className="card p-6">
            <div className="flex items-end gap-2 h-24">
              {stats.weeklyReadingMinutes.map((mins, i) => {
                const days = t('daysShort');
                const maxMins = Math.max(...stats.weeklyReadingMinutes);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: `${(mins / maxMins) * 80}px` }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-300 min-h-[4px]" />
                    <span className="text-[10px] text-gray-400">{days[i]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              {t('avgLabel')} <strong className="text-brand-600">41 {t('minPerDay')}</strong> {t('thisWeek')} 🎉
            </p>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
