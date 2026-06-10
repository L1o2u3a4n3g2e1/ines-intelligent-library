import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiBook, FiGlobe, FiVolume2, FiZap, FiSend } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';

const SUGGESTIONS = [
  { icon: FiBook, tKey: 'suggestBooksBtn', action: 'suggest' },
  { icon: FiGlobe, tKey: 'translateTextBtn', action: 'translate' },
  { icon: FiZap, tKey: 'explainWordBtn', action: 'explain' },
  { icon: FiVolume2, tKey: 'readAloud', action: 'read' },
];

const RESPONSES = {
  suggest: '📚 Based on your reading history, I recommend:\n• "Thinking Fast & Slow" – Daniel Kahneman\n• "The Power of Now" – Eckhart Tolle\n• "Ikigai" – Héctor García',
  translate: '🌐 Select any text on the page, then I\'ll translate it into your chosen language instantly.',
  explain: '💡 Highlight any word or phrase and I\'ll provide a simple, clear explanation.',
  read: '🔊 I can read the current page aloud for you. Use the Audio Player controls to start listening.',
};

export default function AIAssistant({ floating = true }) {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [open, setOpen] = useState(!floating);
  const [messages, setMessages] = useState(() => [
    { role: 'ai', text: t('aiGreeting') }
  ]);
  const [input, setInput] = useState('');

  const send = (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text };
    const action = Object.keys(RESPONSES).find(k => text.toLowerCase().includes(k));
    const aiReply = { role: 'ai', text: action ? RESPONSES[action] : `${t('aiDefaultReply')} "${text}". ${t('aiDefaultReply2')}` };
    setMessages(prev => [...prev, userMsg, aiReply]);
    setInput('');
  };

  const panel = (
    <div className={`flex flex-col bg-white rounded-3xl shadow-card-hover border border-brand-100 overflow-hidden ${floating ? 'w-80 h-96' : 'w-full h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
          <div>
            <p className="text-sm font-semibold">{t('aiAssistant')}</p>
            <p className="text-xs opacity-80">{t('aiAlwaysHere')}</p>
          </div>
        </div>
        {floating && <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white"><FiX size={16} /></button>}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-brand-50 border-b border-brand-100">
        {SUGGESTIONS.map(({ icon: Icon, tKey, action }) => (
          <button key={action} onClick={() => send(action)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-brand-50 transition-colors group">
            <Icon size={14} className="text-brand-500" />
            <span className="text-[9px] text-gray-500 text-center leading-tight">{t(tKey)}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line
              ${m.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-brand-50 text-brand-950 rounded-bl-sm border border-brand-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-brand-100">
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={t('aiAskPlaceholder')}
            className="flex-1 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-xs text-brand-950 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <button type="submit" className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white hover:bg-brand-800 transition-colors flex-shrink-0">
            <FiSend size={12} />
          </button>
        </form>
      </div>
    </div>
  );

  if (!floating) return panel;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}>
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen(v => !v)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(124,58,237,0.35)] flex items-center justify-center text-white transition-all duration-300
          ${open ? 'bg-brand-600' : 'bg-gradient-to-br from-brand-500 to-brand-600'}`}>
        {open ? <FiX size={22} /> : <FiMessageSquare size={22} />}
      </motion.button>
    </div>
  );
}
