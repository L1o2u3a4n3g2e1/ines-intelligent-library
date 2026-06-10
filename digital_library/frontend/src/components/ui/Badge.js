import React from 'react';

const VARIANTS = {
  violet:  'bg-brand-100 text-brand-600',
  cyan:    'bg-audio-100 text-audio-600',
  emerald: 'bg-lang-100 text-lang-600',
  amber:   'bg-amber-100 text-amber-700',
  gray:    'bg-gray-100 text-gray-600',
  white:   'bg-white/20 text-white backdrop-blur-sm',
};

export default function Badge({ variant = 'violet', className = '', children, ...props }) {
  return (
    <span className={`badge ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
