import React from 'react';
import { Link } from 'react-router-dom';

export function LogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="url(#dlGrad)" />
      {/* Left page */}
      <path d="M7 10C7 10 12.5 9 20 11.5L20 31C12.5 28.5 7 30 7 30V10Z" fill="white" opacity="0.92" />
      {/* Right page */}
      <path d="M33 10C33 10 27.5 9 20 11.5L20 31C27.5 28.5 33 30 33 30V10Z" fill="white" opacity="0.60" />
      {/* Spine */}
      <rect x="18.5" y="10.5" width="3" height="20" rx="1.5" fill="white" opacity="0.35" />
      {/* Text lines on left page */}
      <line x1="10" y1="16" x2="17" y2="15.5" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="10" y1="19.5" x2="16.5" y2="19" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" opacity="0.28" />
      <line x1="10" y1="23" x2="15.5" y2="22.6" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" opacity="0.22" />
      {/* Gradient def */}
      <defs>
        <linearGradient id="dlGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Logo({ to = '/', showText = true, textSize = 'text-lg', iconSize = 36 }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group select-none">
      <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
        <LogoIcon size={iconSize} />
      </div>
      {showText && (
        <div className="hidden sm:block leading-none">
          <span className={`font-['Playfair_Display'] font-bold text-brand-950 ${textSize} tracking-tight`}>
            Digital Library
          </span>
        </div>
      )}
    </Link>
  );
}
