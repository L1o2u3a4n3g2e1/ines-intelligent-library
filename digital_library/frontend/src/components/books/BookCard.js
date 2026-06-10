import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBookmark, FiHeadphones, FiGlobe, FiStar, FiBook } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';

const LANG_FLAGS = { en: '🇬🇧', fr: '🇫🇷', sw: '🇰🇪', rw: '🇷🇼' };
const PLACEHOLDER_COLORS = ['#7C3AED','#0891B2','#059669','#DC2626','#D97706','#DB2777'];

export default function BookCard({ book, layout = 'grid', index = 0 }) {
  const { language, toggleBookmark, isBookmarked } = useApp();
  const { t } = useTranslation(language);
  const bookmarked = isBookmarked(book.id);
  const bgColor = PLACEHOLDER_COLORS[book.id % PLACEHOLDER_COLORS.length];

  if (layout === 'list') {
    return (
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
        className="card flex items-center gap-4 p-4 hover:shadow-card-hover group">
        {/* Cover */}
        <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: bgColor }}>
          {book.cover ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
            : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-serif">{book.title.charAt(0)}</div>}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-brand-950 text-sm truncate group-hover:text-brand-600 transition-colors">{book.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{LANG_FLAGS[book.language]} {book.language?.toUpperCase()}</span>
            <span className="flex items-center gap-1 text-xs text-brand-500"><FiStar size={10} className="fill-current" />{book.rating}</span>
            {book.hasAudio && <span className="badge bg-audio-100 text-audio-600"><FiHeadphones size={10} />{t('audioBadge')}</span>}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => toggleBookmark(book)}
            className={`p-2 rounded-xl transition-colors ${bookmarked ? 'text-brand-600 bg-brand-100' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'}`}>
            <FiBookmark size={15} className={bookmarked ? 'fill-current' : ''} />
          </button>
          {book.hasAudio && (
            <Link to={`/read/${book.id}?mode=audio`} className="hidden sm:flex btn-secondary text-xs px-3 py-1.5 items-center gap-1">
              <FiHeadphones size={12} /> {t('listenNow')}
            </Link>
          )}
          <Link to={`/read/${book.id}`} className="btn-primary text-xs px-3 py-1.5">{t('readNow')}</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -4 }} className="card group flex flex-col overflow-hidden">
      {/* Cover */}
      <div className="relative aspect-[2/3] overflow-hidden" style={{ background: bgColor }}>
        {book.cover ? (
          <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ display: book.cover ? 'none' : 'flex' }}>
          <span className="text-5xl font-['Playfair_Display'] font-bold text-white/80">{book.title.charAt(0)}</span>
          <span className="text-xs text-white/60 mt-2 px-4 text-center line-clamp-2">{book.title}</span>
        </div>
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="flex gap-2 w-full">
            <Link to={`/read/${book.id}`} className="flex-1 btn-primary text-xs py-2 text-center">{t('readNow')}</Link>
            {book.hasAudio && <Link to={`/read/${book.id}?mode=audio`} className="btn-secondary text-xs py-2 px-3"><FiHeadphones size={12} /></Link>}
          </div>
        </div>
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {book.hasAudio && <span className="badge bg-audio-600/90 text-white backdrop-blur-sm"><FiHeadphones size={9} />{t('audioBadge')}</span>}
          {book.hasTranslation && <span className="badge bg-lang-600/90 text-white backdrop-blur-sm"><FiGlobe size={9} />Translate</span>}
        </div>
        {/* Bookmark */}
        <button onClick={() => toggleBookmark(book)}
          className={`absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200
            ${bookmarked ? 'bg-brand-600 text-white' : 'bg-white/70 text-brand-600 hover:bg-white'}`}>
          <FiBookmark size={13} className={bookmarked ? 'fill-current' : ''} />
        </button>
        {/* Progress bar */}
        {book.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div className="h-full bg-brand-500" style={{ width: `${book.progress}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-1.5">
        <h3 className="font-semibold text-brand-950 text-sm leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">{book.author}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs">{LANG_FLAGS[book.language]}</span>
            <span className="flex items-center gap-0.5 text-xs text-brand-500 font-medium">
              <FiStar size={10} className="fill-current" />{book.rating}
            </span>
          </div>
          {book.progress > 0 && book.progress < 100 && (
            <span className="text-xs text-brand-500 font-medium">{book.progress}%</span>
          )}
          {book.progress === 100 && (
            <span className="badge bg-green-100 text-green-700"><FiBook size={9} />{t('doneBadge')}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
