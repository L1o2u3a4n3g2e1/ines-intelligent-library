import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../components/ui/Logo';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-brand-100 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-200/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-brand-100/30 blur-2xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo to="/" iconSize={48} textSize="text-xl" />
          </div>
          {title    && <h2 className="mt-4 text-2xl font-['Playfair_Display'] font-semibold text-brand-950">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="glass rounded-3xl shadow-[0_20px_60px_-10px_rgba(124,58,237,0.2)] p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
