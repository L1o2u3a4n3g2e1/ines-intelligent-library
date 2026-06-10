import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMic, FiGrid, FiList, FiX, FiSliders } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import BookCard from '../components/books/BookCard';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { MOCK_BOOKS } from '../data/mockData';
import { CATEGORIES, LANGUAGES } from '../utils/constants';
import { bookService } from '../services/api';

const SORT_OPTIONS = [
  { value: 'relevance', tKey: 'sortRelevance' },
  { value: 'rating',    tKey: 'sortRating'    },
  { value: 'newest',    tKey: 'sortNewest'    },
  { value: 'popular',   tKey: 'sortPopular'   },
];

export default function SearchBooks() {
  const [searchParams] = useSearchParams();
  const { language } = useApp();
  const { t } = useTranslation(language);

  const [query,       setQuery]       = useState(searchParams.get('q') || '');
  const [layout,      setLayout]      = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState({
    lang:     'all',
    category: searchParams.get('category') || 'all',
    hasAudio: searchParams.get('hasAudio') === 'true',
    sort:     'relevance',
  });
  const [listening, setListening] = useState(false);
  const [results,   setResults]   = useState(MOCK_BOOKS);
  const [loading,   setLoading]   = useState(false);

  // Sync URL params → state when navigating here from another page
  useEffect(() => {
    const q   = searchParams.get('q') || '';
    const cat = searchParams.get('category') || 'all';
    setQuery(q);
    setFilters(prev => ({ ...prev, category: cat }));
  }, [searchParams]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookService.search(query, {
        lang:     filters.lang !== 'all'     ? filters.lang     : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        hasAudio: filters.hasAudio || undefined,
        sort:     filters.sort,
      });
      if (Array.isArray(data)) {
        setResults(data);
        setLoading(false);
        return;
      }
    } catch { /* fall through to local filter */ }

    // Local filter on mock data
    let filtered = [...MOCK_BOOKS];
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q)    ||
        b.author.toLowerCase().includes(q)   ||
        b.category.toLowerCase().includes(q) ||
        (b.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (filters.lang !== 'all')     filtered = filtered.filter(b => b.language === filters.lang);
    if (filters.category !== 'all') filtered = filtered.filter(b => b.category === filters.category);
    if (filters.hasAudio)           filtered = filtered.filter(b => b.hasAudio);
    if (filters.sort === 'rating')  filtered.sort((a, b) => b.rating - a.rating);
    if (filters.sort === 'popular') filtered.sort((a, b) => b.readers - a.readers);

    setResults(filtered);
    setLoading(false);
  }, [query, filters]);

  useEffect(() => { runSearch(); }, [runSearch]);

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = language === 'rw' ? 'rw-RW' : 'en-US';
    r.onstart  = () => setListening(true);
    r.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
    r.start();
  };

  const clearAll = () => {
    setQuery('');
    setFilters({ lang: 'all', category: 'all', hasAudio: false, sort: 'relevance' });
  };

  const activeFiltersCount = [
    filters.lang !== 'all',
    filters.category !== 'all',
    filters.hasAudio,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Search header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="section-title text-2xl mb-5">{t('searchTitle')}</h1>

          {/* Search bar */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" size={20} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('search')}
                className="input-field pl-12 pr-12 py-4 text-base shadow-soft"
              />
              {query && (
                <button onClick={() => setQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors">
                  <FiX size={16} />
                </button>
              )}
              <button onClick={startVoice}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${listening ? 'bg-brand-600 text-white animate-mic' : 'text-brand-500 hover:bg-brand-50'}`}>
                <FiMic size={16} />
              </button>
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-4 rounded-2xl border font-medium text-sm transition-all
                ${showFilters || activeFiltersCount > 0
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-brand-200 bg-white text-brand-800 hover:border-brand-500'}`}>
              <FiSliders size={16} />
              <span className="hidden sm:inline">{t('filtersBtn')}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-white text-brand-600 rounded-full text-xs font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="mt-4 p-5 bg-white rounded-2xl border border-brand-100 shadow-soft">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Language */}
                    <div>
                      <label className="text-xs font-semibold text-brand-800 mb-2 block uppercase tracking-wide">{t('language')}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[{ code: 'all', label: 'All', flag: '🌐' }, ...LANGUAGES].map(l => (
                          <button key={l.code} onClick={() => setFilters(p => ({ ...p, lang: l.code }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                              ${filters.lang === l.code ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100'}`}>
                            {l.flag} {l.label || 'All'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Category */}
                    <div>
                      <label className="text-xs font-semibold text-brand-800 mb-2 block uppercase tracking-wide">{t('category')}</label>
                      <select value={filters.category}
                        onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
                        className="input-field py-2 text-sm">
                        <option value="all">{t('allCategories')}</option>
                        {CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Audio */}
                    <div>
                      <label className="text-xs font-semibold text-brand-800 mb-2 block uppercase tracking-wide">{t('filterBy')}</label>
                      <button onClick={() => setFilters(p => ({ ...p, hasAudio: !p.hasAudio }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                          ${filters.hasAudio ? 'border-audio-600 bg-audio-100 text-audio-600' : 'border-brand-200 text-brand-800 hover:border-brand-400'}`}>
                        🎧 {t('audioOnly')}
                      </button>
                    </div>
                    {/* Sort */}
                    <div>
                      <label className="text-xs font-semibold text-brand-800 mb-2 block uppercase tracking-wide">{t('sortBy')}</label>
                      <select value={filters.sort}
                        onChange={e => setFilters(p => ({ ...p, sort: e.target.value }))}
                        className="input-field py-2 text-sm">
                        {SORT_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{t(o.tKey)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={clearAll}
                      className="text-sm text-gray-400 hover:text-brand-600 transition-colors">
                      {t('clearAllFilters')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin inline-block" />
                {t('searching')}
              </span>
            ) : (
              <>
                <strong className="text-brand-950">{results.length}</strong>{' '}
                {results.length !== 1 ? t('booksFound') : t('bookFound')}
                {query && <> {t('forQuery')} <em className="text-brand-600 not-italic font-medium">"{query}"</em></>}
                {filters.category !== 'all' && (
                  <> {t('inCategory')} <span className="text-brand-600 font-medium capitalize">{filters.category}</span></>
                )}
              </>
            )}
          </p>
          <div className="flex gap-1 bg-brand-50 rounded-xl p-1">
            {[{ icon: FiGrid, v: 'grid' }, { icon: FiList, v: 'list' }].map(({ icon: Icon, v }) => (
              <button key={v} onClick={() => setLayout(v)}
                className={`p-2 rounded-lg transition-all ${layout === v ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-brand-600'}`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
              <p className="text-5xl mb-4">📚</p>
              <p className="text-lg font-semibold text-brand-950">{t('noResults')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('trySearch')}</p>
              <button onClick={clearAll} className="btn-secondary mt-5 text-sm">{t('clearSearch')}</button>
            </motion.div>
          ) : layout === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((book, i) => <BookCard key={book.id} book={book} index={i} layout="grid" />)}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-3">
              {results.map((book, i) => <BookCard key={book.id} book={book} index={i} layout="list" />)}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </MainLayout>
  );
}
