import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiHeadphones, FiGlobe, FiBookOpen, FiArrowRight, FiCheck, FiPhone, FiStopCircle } from 'react-icons/fi';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { CATEGORIES, LANGUAGES } from '../utils/constants';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } };

const FEATURES = [
  { icon: FiMic,        titleKey: 'voiceSearchTitle',  descKey: 'featureVoiceDesc',     color: 'var(--brand-200)' },
  { icon: FiHeadphones, titleKey: 'audiobooks',        descKey: 'featureAudioDesc',     color: 'var(--audio-100)' },
  { icon: FiGlobe,      titleKey: 'translationTitle',  descKey: 'featureTranslateDesc', color: 'var(--lang-100)'  },
  { icon: FiBookOpen,   titleKey: 'lowLiteracyTitle',  descKey: 'featureLowLitDesc',    color: 'var(--brand-100)' },
];

const STATS = [
  { value: '5,000+', labelKey: 'booksAvailable' },
  { value: '2',      labelKey: 'languagesLabel' },
  { value: '50K+',   labelKey: 'activeReaders' },
  { value: '98%',    labelKey: 'accessibilityScore' },
];

const ACC_FEATURE_KEYS = ['featureLargerText', 'featureVoiceGuidance', 'featureSimpleNav', 'featureHighContrast', 'featureIconFirst'];

const TRANSLATION_DEMO = [
  { en: 'I want to learn about good health practices.', rw: 'Ndashaka kwiga ku myitwarire myiza y\'ubuzima.' },
  { en: 'This book changed my life completely.',        rw: 'Iki gitabo cyahinduye ubuzima bwanjye bwose.' },
  { en: 'Agriculture is the backbone of our economy.', rw: 'Ubuhinzi ni inkingi y\'ubukungu bwacu.' },
];

export default function Landing() {
  const { language, login } = useApp();
  const { t } = useTranslation(language);
  const navigate = useNavigate();
  const [hoveredCat, setHoveredCat] = useState(null);

  // STT demo state
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // Translation demo state
  const [demoIdx, setDemoIdx] = useState(0);
  const [showRw, setShowRw] = useState(false);

  // Guest login state
  const [guestPhone, setGuestPhone] = useState('');
  const [guestError, setGuestError] = useState('');

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceText('Voice search not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = language === 'rw' ? 'rw-RW' : 'en-US';
    r.onstart  = () => { setListening(true); setVoiceText(''); };
    r.onresult = (e) => { setVoiceText(e.results[0][0].transcript); setListening(false); };
    r.onerror  = r.onend = () => setListening(false);
    r.start();
  };

  const handleGuestContinue = () => {
    const clean = guestPhone.replace(/\s/g, '');
    if (!clean || clean.length < 9) {
      setGuestError(t('phoneInvalid'));
      return;
    }
    setGuestError('');
    login({ id: `guest-${Date.now()}`, name: 'Guest', phone: clean, isGuest: true, avatar: null }, 'guest-token');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-200/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-brand-500/15 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              {/* Language badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {LANGUAGES.map((l, i) => (
                  <motion.span key={l.code} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full text-xs font-medium text-brand-600 border border-brand-200/50 shadow-sm">
                    {l.flag} {l.label}
                  </motion.span>
                ))}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-['Playfair_Display'] font-bold text-brand-950 leading-tight mb-6 whitespace-pre-line">
                {t('heroTitle')}
              </h1>
              <p className="text-lg text-brand-800 leading-relaxed mb-8 max-w-lg">{t('heroSub')}</p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 mb-5">
                <Link to="/register">
                  <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="btn-primary text-base px-7 py-3.5 gap-2">
                    {t('startReading')} <FiArrowRight />
                  </motion.button>
                </Link>
                <Link to="/search">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn-secondary text-base px-7 py-3.5">
                    {t('learnMore')}
                  </motion.button>
                </Link>
              </div>

              {/* Guest access with phone */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-brand-200 rounded-2xl px-3 py-2 shadow-sm">
                  <FiPhone size={14} className="text-brand-500 flex-shrink-0" />
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={e => { setGuestPhone(e.target.value); setGuestError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleGuestContinue()}
                    placeholder="+250 7XX XXX XXX"
                    className="bg-transparent text-sm text-brand-950 placeholder-gray-400 focus:outline-none w-40"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleGuestContinue}
                  className="text-sm font-semibold text-brand-600 px-4 py-2 rounded-2xl border border-brand-200 bg-white/80 hover:bg-brand-50 transition-all">
                  {t('continueAsGuest')} →
                </motion.button>
              </div>
              {guestError && <p className="text-xs text-red-500 mt-1.5">{guestError}</p>}

              {/* Voice hint */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="mt-6 flex items-center gap-3 text-sm text-gray-500">
                <div className="w-8 h-8 rounded-full bg-brand-600/10 flex items-center justify-center animate-mic">
                  <FiMic size={14} className="text-brand-600" />
                </div>
                <span>Say <em className="text-brand-600 font-medium not-italic">"Nshaka igitabo cy'ubuzima"</em></span>
              </motion.div>
            </motion.div>

            {/* Hero illustration */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-sm">
                <div className="glass rounded-3xl p-6 shadow-[0_20px_60px_-10px_rgba(124,58,237,0.25)] animate-float">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg">DL</div>
                    <div>
                      <p className="font-semibold text-brand-950 text-sm">Digital Library</p>
                      <p className="text-xs text-gray-500">AI-Powered Reading</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: 'Atomic Habits',    lang: '🇬🇧', progress: 65 },
                      { title: 'Ubuzima Bwiza',    lang: '🇷🇼', progress: 80 },
                      { title: 'Ubuhinzi Bwiza',   lang: '🇷🇼', progress: 42 },
                    ].map((b, i) => (
                      <div key={i} className="bg-brand-50 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-9 h-12 rounded-lg bg-gradient-to-br from-brand-200 to-brand-500 flex items-center justify-center text-white text-lg flex-shrink-0">📖</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-brand-950 truncate">{b.title}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="flex-1 h-1 bg-brand-200 rounded-full"><div className="h-full bg-brand-600 rounded-full" style={{ width: `${b.progress}%` }} /></div>
                            <span className="text-[10px] text-gray-500">{b.progress}%</span>
                          </div>
                        </div>
                        <span className="text-base">{b.lang}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-4 -right-4 glass rounded-2xl px-3 py-2 shadow-card">
                  <p className="text-xs font-semibold text-brand-600">🎧 Audio Ready</p>
                </motion.div>
                <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-4 -left-4 glass rounded-2xl px-3 py-2 shadow-card">
                  <p className="text-xs font-semibold text-brand-600">🌍 EN & RW</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="text-center">
                <p className="font-['Playfair_Display'] text-3xl font-bold text-brand-600">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{t(s.labelKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-600 text-xs font-semibold rounded-full mb-4">{t('whyChooseUs')}</span>
            <h2 className="text-4xl font-['Playfair_Display'] font-bold text-brand-950">{t('builtForEvery')}</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">{t('builtDesc')}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="card p-6 text-center group">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${f.color}50` }}>
                  <f.icon size={24} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-brand-950 mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOICE SEARCH DEMO ────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-brand-950 to-brand-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-8 left-8 w-72 h-72 rounded-full border-2 border-white" />
          <div className="absolute bottom-8 right-8 w-48 h-48 rounded-full border-2 border-white" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-block px-4 py-1.5 bg-white/15 text-brand-200 text-xs font-semibold rounded-full mb-5">{t('sttBadge')}</span>
            <h2 className="text-4xl font-['Playfair_Display'] font-bold mb-4">{t('voiceSearchTitle')}</h2>
            <p className="text-brand-200 text-lg mb-10">{t('voiceSearchDesc')}</p>

            {/* Mic button */}
            <div className="flex flex-col items-center gap-6">
              <motion.button
                onClick={listening ? undefined : startVoice}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
                  listening ? 'bg-red-500 animate-mic cursor-default' : 'bg-brand-600 hover:bg-brand-500'
                }`}>
                {listening ? <FiStopCircle size={36} /> : <FiMic size={36} />}
              </motion.button>

              <p className="text-sm text-brand-300">
                {listening ? t('listeningSpeak') : t('tapMicSpeak')}
              </p>

              <AnimatePresence>
                {voiceText && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass rounded-2xl px-6 py-4 max-w-md w-full text-center">
                    <p className="text-xs text-brand-300 mb-1 uppercase tracking-wide">{t('youSaid')}</p>
                    <p className="text-white font-medium">"{voiceText}"</p>
                    <Link to={`/search?q=${encodeURIComponent(voiceText)}`}>
                      <button className="mt-3 text-xs bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all">
                        {t('searchForThis')} <FiArrowRight size={11} className="inline ml-1" />
                      </button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Demo examples */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Health book', 'Igitabo cy\'ubuhinzi', 'Atomic Habits', 'Ubuzima Bwiza'].map(ex => (
                  <Link key={ex} to={`/search?q=${encodeURIComponent(ex)}`}>
                    <span className="inline-flex items-center gap-1.5 text-xs text-brand-200 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full cursor-pointer transition-all">
                      <FiMic size={10} /> {ex}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TRANSLATION DEMO ─────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-lang-100 text-lang-600 text-xs font-semibold rounded-full mb-4">{t('translationBadge')}</span>
            <h2 className="text-4xl font-['Playfair_Display'] font-bold text-brand-950">{t('translationTitle')}</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">{t('translationDesc')}</p>
          </motion.div>

          <motion.div {...fadeUp} className="card p-8 max-w-3xl mx-auto">
            {/* Language toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-950">
                🇬🇧 English
              </div>
              <button onClick={() => setShowRw(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  showRw ? 'bg-lang-100 text-lang-600 border-lang-100' : 'bg-brand-50 text-brand-600 border-brand-200 hover:border-brand-400'
                }`}>
                <FiGlobe size={14} />
                {showRw ? t('hideKinyarwanda') : t('translateToKinyarwanda')}
              </button>
            </div>

            {/* Text panels */}
            <div className={`grid gap-4 ${showRw ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="bg-brand-50 rounded-2xl p-5 border border-brand-100">
                <p className="text-xs font-semibold text-brand-500 mb-3 uppercase tracking-wide">🇬🇧 English</p>
                <p className="text-brand-950 leading-relaxed">{TRANSLATION_DEMO[demoIdx].en}</p>
              </div>
              <AnimatePresence>
                {showRw && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="bg-lang-100 rounded-2xl p-5 border border-lang-100">
                    <p className="text-xs font-semibold text-lang-600 mb-3 uppercase tracking-wide">🇷🇼 Kinyarwanda</p>
                    <p className="text-brand-950 leading-relaxed">{TRANSLATION_DEMO[demoIdx].rw}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demo navigation */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {TRANSLATION_DEMO.map((_, i) => (
                <button key={i} onClick={() => setDemoIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${demoIdx === i ? 'bg-brand-600 w-5' : 'bg-brand-200'}`} />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">{t('clickDots')}</p>
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────── */}
      <section className="py-16 px-6 bg-brand-50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-['Playfair_Display'] font-bold text-brand-950">{t('exploreByTopic')}</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CATEGORIES.map((c, i) => (
              <motion.div key={c.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                whileHover={{ scale: 1.04, y: -3 }}
                onHoverStart={() => setHoveredCat(c.id)} onHoverEnd={() => setHoveredCat(null)}
                className={`cursor-pointer p-4 rounded-2xl text-center transition-all duration-200 border
                  ${hoveredCat === c.id ? 'shadow-card border-transparent' : 'border-gray-200 bg-white hover:bg-brand-50'}`}
                style={{ background: hoveredCat === c.id ? c.color : undefined }}>
                <span className="text-2xl">{c.icon}</span>
                <p className="text-xs font-medium text-brand-800 mt-2">{c.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCESSIBILITY SECTION ────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center">
            <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-600 text-xs font-semibold rounded-full mb-5">{t('accessibilityFirst')}</span>
            <h2 className="text-4xl font-['Playfair_Display'] font-bold text-brand-950 mb-4">{t('lowLiteracyTitle')}</h2>
            <p className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto">{t('lowLiteracyLong')}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {ACC_FEATURE_KEYS.map((key, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full text-sm text-brand-800 border border-brand-100">
                  <FiCheck size={13} className="text-brand-500" /> {t(key)}
                </div>
              ))}
            </div>
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="btn-primary text-base px-8 py-3.5 gap-2">
                {t('startReading')} <FiArrowRight />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
