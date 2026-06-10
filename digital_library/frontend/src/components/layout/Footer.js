import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiMail } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import Logo from '../ui/Logo';

export default function Footer() {
  const { language } = useApp();
  const { t } = useTranslation(language);
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-3">
              <Logo to="/" iconSize={32} textSize="text-base" />
            </div>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{t('tagline')}</p>
            <div className="flex gap-3 mt-4">
              {[FiGithub, FiTwitter, FiMail].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-brand-950 mb-3">{t('platformLabel')}</h4>
            <ul className="space-y-2">
              {[['Search Books', '/search'], ['Upload', '/upload'], ['Dashboard', '/dashboard']].map(([l, h]) => (
                <li key={h}><Link to={h} className="text-sm text-gray-500 hover:text-brand-600 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-brand-950 mb-3">{t('languagesLabel')}</h4>
            <ul className="space-y-2">
              {['🇬🇧 English', '🇷🇼 Kinyarwanda'].map(l => (
                <li key={l}><span className="text-sm text-gray-500">{l}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{t('footerCopy')}</p>
        </div>
      </div>
    </footer>
  );
}
