export const LANGUAGES = [
  { code: 'en', label: 'English',     flag: '🇬🇧', dir: 'ltr' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼', dir: 'ltr' },
];

export const CATEGORIES = [
  { id: 'fiction',     label: 'Fiction',     icon: '📖', color: 'var(--brand-200)'  },
  { id: 'science',     label: 'Science',     icon: '🔬', color: 'var(--audio-100)'  },
  { id: 'history',     label: 'History',     icon: '🏛️', color: 'var(--brand-100)'  },
  { id: 'health',      label: 'Health',      icon: '❤️', color: '#FEE2E2'           },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾', color: 'var(--lang-100)'   },
  { id: 'business',    label: 'Business',    icon: '💼', color: 'var(--brand-100)'  },
  { id: 'education',   label: 'Education',   icon: '🎓', color: '#FEF3C7'           },
  { id: 'technology',  label: 'Technology',  icon: '💻', color: 'var(--audio-100)'  },
  { id: 'family',      label: 'Family',      icon: '👨‍👩‍👧', color: '#FEF3C7'           },
  { id: 'religion',    label: 'Religion',    icon: '✝️', color: 'var(--brand-100)'  },
];

export const READING_SPEEDS = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export const FONT_SIZES = [
  { value: 'sm', label: 'S', size: '0.9rem' },
  { value: 'md', label: 'M', size: '1.1rem' },
  { value: 'lg', label: 'L', size: '1.25rem' },
  { value: 'xl', label: 'XL', size: '1.4rem' },
];

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
