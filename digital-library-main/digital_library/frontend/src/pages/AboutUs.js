import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTarget, FiEye, FiHeart, FiUsers } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';

export default function AboutUs() {
  const { language } = useApp();
  const { t } = useTranslation(language);

  const features = [
    {
      icon: <FiTarget className="w-8 h-8" />,
      title: t('ourMission'),
      desc: t('missionText'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <FiEye className="w-8 h-8" />,
      title: t('ourVision'),
      desc: t('visionText'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: <FiHeart className="w-8 h-8" />,
      title: t('whyWeExist'),
      desc: t('whyText'),
      color: 'from-rose-500 to-rose-600'
    },
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: t('ourTeam'),
      desc: t('teamText'),
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  const stats = [
    { number: '10K+', label: language === 'rw' ? 'Ibitabo' : 'Books' },
    { number: '2', label: language === 'rw' ? 'Indimi' : 'Languages' },
    { number: '5K+', label: language === 'rw' ? 'Abakoresha' : 'Users' },
    { number: '24/7', label: language === 'rw' ? 'Umuserivu' : 'Support' }
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
        {/* Hero */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-950 mb-4">
              {t('aboutUs')}
            </h1>
            <p className="text-lg text-brand-700 max-w-2xl mx-auto">
              {language === 'rw'
                ? 'Kutuziba mu mutwe bwacu n\'imigambi yacu yo gushyiraho ubumenyi hejuru ya Afrika.'
                : 'Learn about our mission to democratize knowledge access across Africa.'
              }
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-brand-950 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-12 mb-20"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <p className="text-4xl font-bold text-white mb-2">{stat.number}</p>
                  <p className="text-brand-100">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-12 border border-gray-100"
          >
            <h2 className="text-3xl font-bold text-brand-950 mb-8 text-center">
              {language === 'rw' ? 'Indahiro Zacu' : 'Our Core Values'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: language === 'rw' ? 'Ubwiyunge' : 'Accessibility',
                  desc: language === 'rw'
                    ? 'Ikirango cyemewe ku buri muntu'
                    : 'Technology accessible to everyone'
                },
                {
                  title: language === 'rw' ? 'Umuseso' : 'Quality',
                  desc: language === 'rw'
                    ? 'Ibigire byizewe n\'byohejwe neza'
                    : 'Curated and verified content'
                },
                {
                  title: language === 'rw' ? 'Ubwiyunge' : 'Inclusion',
                  desc: language === 'rw'
                    ? 'Indimi, itsinda, n\'ubumenyi n\'ubwiyunge'
                    : 'Languages, cultures, and knowledge'
                }
              ].map((value, idx) => (
                <div key={idx} className="text-center">
                  <h3 className="text-xl font-bold text-brand-950 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
