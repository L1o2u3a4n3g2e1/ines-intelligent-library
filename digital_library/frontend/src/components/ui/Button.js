import React from 'react';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
};

const SIZES = {
  xs: 'text-xs px-3 py-1.5',
  sm: 'text-sm px-4 py-2',
  md: '',
  lg: 'text-base px-8 py-4',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  className = '',
  children,
  ...props
}) {
  const cls = [VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ');
  return <Tag className={cls} {...props}>{children}</Tag>;
}
