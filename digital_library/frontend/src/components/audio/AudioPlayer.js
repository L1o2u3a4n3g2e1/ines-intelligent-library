import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiSquare, FiVolume2, FiVolumeX, FiSkipBack, FiSkipForward } from 'react-icons/fi';
import { MdSpeed } from 'react-icons/md';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ text = '', lang = 'en', compact = false, autoPlay = false }) {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const utterRef = useRef(null);
  const words = text.split(' ');
  const totalWords = words.length;
  const [wordIndex, setWordIndex] = useState(0);

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setProgress(0);
    setWordIndex(0);
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'rw' ? 'rw-RW' : lang === 'sw' ? 'sw-KE' : lang === 'fr' ? 'fr-FR' : 'en-US';
    utter.rate = speed;
    utter.volume = muted ? 0 : 1;
    utter.onboundary = (e) => {
      if (e.name === 'word') {
        const pct = Math.min(100, (e.charIndex / text.length) * 100);
        setProgress(pct);
        setWordIndex(Math.floor((e.charIndex / text.length) * totalWords));
      }
    };
    utter.onend = () => { setPlaying(false); setProgress(100); };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setPlaying(true);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking) {
      if (playing) { window.speechSynthesis.pause(); setPlaying(false); }
      else { window.speechSynthesis.resume(); setPlaying(true); }
    } else { speak(); }
  };

  useEffect(() => {
    if (utterRef.current) { utterRef.current.rate = speed; }
  }, [speed]);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  useEffect(() => { if (autoPlay && text) speak(); }, [autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-brand-50 rounded-2xl px-4 py-3 border border-brand-100">
        <button onClick={pause} className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all ${playing ? 'bg-brand-600' : 'bg-brand-500 hover:bg-brand-600'}`}>
          {playing ? <FiPause size={14} /> : <FiPlay size={14} />}
        </button>
        <div className="flex-1 h-1.5 bg-brand-200 rounded-full overflow-hidden cursor-pointer">
          <div className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={stop} className="text-gray-400 hover:text-brand-600 transition-colors">
          <FiSquare size={13} />
        </button>
        <span className="text-xs text-gray-500 font-medium">{speed}x</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-brand-100 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-brand-950">{t('audioReading')}</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(v => !v)} className="text-brand-500 hover:text-brand-600 transition-colors p-1">
            {muted ? <FiVolumeX size={15} /> : <FiVolume2 size={15} />}
          </button>
          <div className="relative">
            <button onClick={() => setShowSpeed(v => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors p-1">
              <MdSpeed size={15} />{speed}x
            </button>
            {showSpeed && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card border border-brand-100 py-1 z-10 min-w-[64px]">
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => { setSpeed(s); setShowSpeed(false); }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-brand-50 transition-colors ${speed === s ? 'text-brand-600 font-semibold' : 'text-brand-800'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="h-2 bg-brand-100 rounded-full overflow-hidden cursor-pointer">
          <motion.div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
            style={{ width: `${progress}%` }} transition={{ duration: 0.2 }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-400">{t('wordLabel')} {wordIndex} / {totalWords}</span>
          <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setSpeed(s => SPEEDS[Math.max(0, SPEEDS.indexOf(s) - 1)])}
          className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">
          <FiSkipBack size={14} />
        </button>
        <button onClick={pause}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-glow transition-all duration-200 active:scale-95
            ${playing ? 'bg-brand-600 hover:bg-brand-800' : 'bg-gradient-to-br from-brand-500 to-brand-600 hover:shadow-[0_0_24px_rgba(124,58,237,0.4)]'}`}>
          {playing ? <FiPause size={22} /> : <FiPlay size={22} className="ml-1" />}
        </button>
        <button onClick={stop}
          className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">
          <FiSquare size={14} />
        </button>
        <button onClick={() => setSpeed(s => SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + 1)])}
          className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">
          <FiSkipForward size={14} />
        </button>
      </div>
    </motion.div>
  );
}
