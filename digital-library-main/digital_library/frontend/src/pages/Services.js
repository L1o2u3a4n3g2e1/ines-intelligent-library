import React from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiGlobe, FiHeadphones, FiUpload, FiEye, FiDownload } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';

export default function Services() {
  const { language } = useApp();
  const { t } = useTranslation(language);

  const services = [
    {
      icon: <FiMic className="w-12 h-12" />,
      title: t('serviceVoiceSearch'),
      desc: t('serviceVoiceSearchDesc'),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: <FiGlobe className="w-12 h-12" />,
      title: t('serviceTranslation'),
      desc: t('serviceTranslationDesc'),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: <FiHeadphones className="w-12 h-12" />,
      title: t('serviceAudioBooks'),
      desc: t('serviceAudioBooksDesc'),
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      icon: <FiUpload className="w-12 h-12" />,
      title: t('serviceUpload'),
      desc: t('serviceUploadDesc'),
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: <FiEye className="w-12 h-12" />,
      title: t('serviceLowLit'),
      desc: t('serviceLowLitDesc'),
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: <FiDownload className="w-12 h-12" />,
      title: t('serviceOffline'),
      desc: t('serviceOfflineDesc'),
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-white to-brand-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-950 mb-4">
              {t('services')}
            </h1>
            <p className="text-lg text-brand-700 max-w-2xl mx-auto">
              {language === 'rw'
                ? 'Ibirindiro byacu byishimira kubushaka bwacu gutanga serivisi nziza n\'ihuye.'
                : 'Powerful features designed to make reading accessible and enjoyable for everyone.'
              }
            </p>
          </motion.div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {services.map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`${service.bgColor} rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition group`}
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${service.color} text-white mb-4 group-hover:scale-110 transition`}>
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-brand-950 mb-3">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-12 border border-gray-100 mb-20"
          >
            <h2 className="text-3xl font-bold text-brand-950 mb-8 text-center">
              {language === 'rw' ? 'Ibi Bikora Ute' : 'How It Works'}
            </h2>
            <div className="grid md:grid-cols-4 gap-4 md:gap-8">
              {[
                {
                  step: '1',
                  title: language === 'rw' ? 'Injira' : 'Sign Up',
                  desc: language === 'rw' ? 'Kora akawonto ka bure' : 'Create your free account'
                },
                {
                  step: '2',
                  title: language === 'rw' ? 'Shakisha' : 'Discover',
                  desc: language === 'rw' ? 'Shakisha ibitabo' : 'Browse thousands of books'
                },
                {
                  step: '3',
                  title: language === 'rw' ? 'Soma' : 'Read',
                  desc: language === 'rw' ? 'Soma mu rurimi rwawe' : 'Read in your language'
                },
                {
                  step: '4',
                  title: language === 'rw' ? 'Sangira' : 'Share',
                  desc: language === 'rw' ? 'Sangira n\'isi' : 'Share with community'
                }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-brand-950 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-12 text-center text-white"
          >
            <h2 className="text-3xl font-bold mb-4">
              {language === 'rw' ? 'Tangira Ubu Murugo Runini' : 'Start Your Reading Journey Today'}
            </h2>
            <p className="text-brand-100 mb-8 max-w-2xl mx-auto">
              {language === 'rw'
                ? 'Bona akawonto ka bure n\'wumva ibibaro byose.'
                : 'Create a free account and access all features immediately.'
              }
            </p>
            <button className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold px-8 py-3 rounded-xl hover:bg-brand-50 transition">
              {language === 'rw' ? 'Tangira' : 'Get Started'} →
            </button>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
