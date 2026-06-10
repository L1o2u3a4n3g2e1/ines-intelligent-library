import React from 'react';

const VARIANTS = {
  default:  'card',
  flat:     'bg-white rounded-3xl border border-gray-200',
  elevated: 'bg-white rounded-3xl border border-gray-200 shadow-card-hover',
  surface:  'bg-brand-50 rounded-3xl border border-brand-100',
};

export default function Card({ variant = 'default', className = '', children, ...props }) {
  return (
    <div className={`${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
