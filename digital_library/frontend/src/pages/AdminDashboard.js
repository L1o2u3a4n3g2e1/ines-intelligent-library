import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiBook, FiUpload, FiActivity, FiTrash2, FiEdit2, FiCheck, FiX, FiShield } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { MOCK_BOOKS } from '../data/mockData';

const MOCK_USERS = [
  { id: 1, name: 'Anne Louange',      email: 'yasriyag9@gmail.com', role: 'admin', books: 14, joined: '2024-01-15', active: true  },
  { id: 2, name: 'Jean-Paul Murera',  email: 'jp@example.com',      role: 'user',  books: 6,  joined: '2024-02-20', active: true  },
  { id: 3, name: 'Amina Diallo',      email: 'amina@example.com',   role: 'user',  books: 23, joined: '2024-03-01', active: false },
  { id: 4, name: 'Samuel Nkurunziza', email: 'sam@example.com',     role: 'user',  books: 11, joined: '2024-03-15', active: true  },
];

const StatCard = ({ icon: Icon, value, label, trend, color }) => (
  <motion.div whileHover={{ y: -3 }} className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      {trend && <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{trend > 0 ? '+' : ''}{trend}%</span>}
    </div>
    <p className="text-2xl font-['Playfair_Display'] font-bold text-brand-950">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </motion.div>
);

export default function AdminDashboard() {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState(MOCK_USERS);
  const [books, setBooks] = useState(MOCK_BOOKS);

  const toggleUser = (id) => setUsers(us => us.map(u => u.id === id ? { ...u, active: !u.active } : u));
  const deleteBook = (id) => setBooks(bs => bs.filter(b => b.id !== id));

  const LANG_STATS = [
    { lang: '🇬🇧 English',     count: 8, pct: 67 },
    { lang: '🇷🇼 Kinyarwanda', count: 4, pct: 33 },
  ];

  const USER_COLS   = [t('colUser'), t('colRole'), t('colBooks'), t('colJoined'), t('colStatus'), t('colActions')];
  const BOOK_COLS   = [t('books'),   t('colLanguage'), t('colCategory'), t('colRating'), t('colReaders'), t('colAudio'), t('colActions')];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center">
            <FiShield size={18} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-['Playfair_Display'] font-bold text-brand-950">{t('adminTitle')}</h1>
            <p className="text-sm text-gray-500">{t('adminSubtitle')}</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FiUsers}    value={MOCK_USERS.length} label={t('totalUsers')}    trend={12}   color="#7C3AED" />
          <StatCard icon={FiBook}     value={MOCK_BOOKS.length} label={t('totalBooks')}    trend={8}    color="#8B5CF6" />
          <StatCard icon={FiUpload}   value="2"                 label={t('pendingReview')} trend={null} color="#D4A574" />
          <StatCard icon={FiActivity} value="50K"               label={t('monthlyReads')}  trend={23}   color="#A78BFA" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-brand-100">
          {[['overview', t('tabOverview')], ['users', t('tabUsers')], ['books', t('tabBooks')]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === v ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-brand-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-semibold text-brand-950 mb-4">{t('booksByLanguage')}</h3>
              {LANG_STATS.map((l, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-brand-800 w-36 flex-shrink-0">{l.lang}</span>
                  <div className="flex-1 h-2 bg-brand-100 rounded-full">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="h-full bg-brand-600 rounded-full" />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{l.count}</span>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-brand-950 mb-4">{t('recentActivity')}</h3>
              <div className="space-y-3">
                {[
                  { icon: '📤', text: 'New book uploaded: "Atomic Habits"',          time: '2m ago'  },
                  { icon: '👤', text: 'New user registered: Samuel N.',               time: '15m ago' },
                  { icon: '🎧', text: 'Audio generated for "Sapiens"',                time: '1h ago'  },
                  { icon: '🌍', text: 'Translation complete: EN → RW',                time: '2h ago'  },
                  { icon: '⭐', text: 'Book review: "The Alchemist" (5★)',            time: '3h ago'  },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors">
                    <span className="text-base flex-shrink-0">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-950 truncate">{a.text}</p>
                      <p className="text-xs text-gray-400">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-brand-100 bg-brand-50">
                  {USER_COLS.map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-4 uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr key={u.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="border-b border-brand-50 hover:bg-brand-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-200 to-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{u.name.charAt(0)}</div>
                          <div><p className="text-sm font-medium text-brand-950">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className={`badge ${u.role === 'admin' ? 'bg-brand-100 text-brand-600' : 'bg-brand-50 text-gray-500'}`}>{u.role}</span></td>
                      <td className="px-5 py-4 text-sm text-brand-800">{u.books}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{u.joined}</td>
                      <td className="px-5 py-4">
                        <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                          {u.active ? t('statusActive') : t('statusInactive')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => toggleUser(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                            {u.active ? <FiX size={14} /> : <FiCheck size={14} />}
                          </button>
                          <button className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"><FiEdit2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Books tab */}
        {tab === 'books' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-brand-100 bg-brand-50">
                  {BOOK_COLS.map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-4 uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {books.map((b, i) => (
                    <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="border-b border-brand-50 hover:bg-brand-50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-brand-950 truncate max-w-[180px]">{b.title}</p>
                          <p className="text-xs text-gray-500">{b.author}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-brand-800 uppercase">{b.language}</td>
                      <td className="px-5 py-4"><span className="badge bg-brand-50 text-brand-600">{b.category}</span></td>
                      <td className="px-5 py-4 text-sm font-medium text-brand-500">⭐ {b.rating}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{(b.readers / 1000).toFixed(1)}K</td>
                      <td className="px-5 py-4">
                        <span className={`badge ${b.hasAudio ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-gray-400'}`}>
                          {b.hasAudio ? t('yes') : t('no')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"><FiEdit2 size={14} /></button>
                          <button onClick={() => deleteBook(b.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
