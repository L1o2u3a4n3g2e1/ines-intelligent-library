import React from 'react';

export function Input({ className = '', ...props }) {
  return <input className={`input-field ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`input-field ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`input-field resize-none ${className}`} {...props} />;
}

export default Input;
