import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBookmark, FiSearch } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import BookCard from '../components/books/BookCard';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';

export default function Bookmarks() {
  const { bookmarks, language } = useApp();
  const { t } = useTranslation(language);
  const [search, setSearch] = useState('');

  const filtered = bookmarks.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center">
              <FiBookmark size={18} className="text-brand-600 fill-current" />
            </div>
            <h1 className="section-title text-2xl">{t('bookmarks')}</h1>
          </div>
          <p className="text-sm text-gray-500">{bookmarks.length} {bookmarks.length !== 1 ? t('bookPlural') : t('bookSingular')} {t('savedBooksCount')}</p>
        </motion.div>

        {bookmarks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 card">
            <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
              <FiBookmark size={32} className="text-brand-200" />
            </div>
            <h2 className="text-lg font-['Playfair_Display'] font-semibold text-brand-950 mb-2">{t('noBookmarks')}</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">{t('noBookmarksDesc')}</p>
          </motion.div>
        ) : (
          <>
            <div className="relative mb-6">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('searchBookmarks')} className="input-field pl-10" />
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-12">{t('noBookmarksMatch')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filtered.map((book, i) => (
                    <motion.div key={book.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}>
                      <BookCard book={book} index={i} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
