import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiUser, FiLock, FiBell, FiEye, FiGlobe, FiShield,
  FiHelpCircle, FiFileText, FiMail, FiChevronRight
} from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';

export default function Settings() {
  const { language, theme, setTheme, lowLiteracy, setLowLiteracy, user } = useApp();
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: t('accountSettings'), icon: <FiUser size={18} /> },
    { id: 'display', label: t('displaySettings'), icon: <FiEye size={18} /> },
    { id: 'notifications', label: t('notificationSettings'), icon: <FiBell size={18} /> },
    { id: 'privacy', label: t('privacySettings'), icon: <FiShield size={18} /> },
  ];

  const settingItems = [
    { id: 'email', label: 'Email', value: user?.email || 'user@example.com', icon: <FiMail size={18} /> },
    { id: 'password', label: t('changePassword'), value: '••••••••', icon: <FiLock size={18} /> },
    { id: 'language', label: t('language'), value: language === 'rw' ? 'Kinyarwanda' : 'English', icon: <FiGlobe size={18} /> },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-bold text-brand-950 mb-2">{t('settingsPage')}</h1>
            <p className="text-gray-600">
              {language === 'rw'
                ? 'Gucunga igenamiterere rya konto n\'ikirango cyawe'
                : 'Manage your account settings and preferences'
              }
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 transition ${
                      activeTab === tab.id
                        ? 'bg-brand-50 text-brand-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Account Settings */}
              {activeTab === 'account' && (
                <div className="space-y-4">
                  {settingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-brand-600">{item.icon}</div>
                        <div>
                          <p className="text-sm text-gray-600">{item.label}</p>
                          <p className="font-semibold text-brand-950">{item.value}</p>
                        </div>
                      </div>
                      <FiChevronRight className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Display Settings */}
              {activeTab === 'display' && (
                <div className="space-y-4">
                  {/* Theme */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-brand-950 mb-1">
                          {language === 'rw' ? 'Uburyo bw\'Umukara' : 'Dark Mode'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {language === 'rw' ? 'Hindura kuri uburyo bw\'umukara' : 'Switch to dark theme'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={theme === 'dark'}
                          onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Low Literacy Mode */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-brand-950 mb-1">{t('lowLiteracy')}</h3>
                        <p className="text-sm text-gray-600">{t('lowLiteracyModeDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lowLiteracy}
                          onChange={() => setLowLiteracy(!lowLiteracy)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  {[
                    { label: t('emailNotifications'), desc: 'Receive updates via email' },
                    { label: t('smsNotifications'), desc: 'Get SMS alerts' }
                  ].map((notif, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-brand-950 mb-1">{notif.label}</h3>
                          <p className="text-sm text-gray-600">{notif.desc}</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Privacy Settings */}
              {activeTab === 'privacy' && (
                <div className="space-y-4">
                  {[
                    { label: t('privacyPolicy'), icon: <FiFileText size={18} /> },
                    { label: t('termsConditions'), icon: <FiFileText size={18} /> },
                    { label: t('contactUs'), icon: <FiHelpCircle size={18} /> }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-brand-600">{item.icon}</div>
                        <p className="font-semibold text-brand-950">{item.label}</p>
                      </div>
                      <FiChevronRight className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
