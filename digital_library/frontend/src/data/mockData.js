export const MOCK_BOOKS = [
  {
    id: 1, title: 'The Psychology of Persuasion', author: 'Robert Cialdini',
    cover: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    language: 'en', category: 'business', pages: 320, progress: 65,
    hasAudio: true, hasTranslation: true, rating: 4.8, readers: 12400,
    description: 'Influence explains the psychology of why people say yes and how to apply these insights ethically.',
    tags: ['psychology', 'persuasion', 'business'],
  },
  {
    id: 2, title: 'Atomic Habits', author: 'James Clear',
    cover: 'https://covers.openlibrary.org/b/id/10471365-L.jpg',
    language: 'en', category: 'education', pages: 320, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.9, readers: 28000,
    description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
    tags: ['habits', 'productivity', 'self-help'],
  },
  {
    id: 3, title: 'Sapiens', author: 'Yuval Noah Harari',
    cover: 'https://covers.openlibrary.org/b/id/8971195-L.jpg',
    language: 'en', category: 'history', pages: 443, progress: 45,
    hasAudio: true, hasTranslation: true, rating: 4.7, readers: 31000,
    description: 'A Brief History of Humankind — from stone-age to the age of algorithms.',
    tags: ['history', 'anthropology', 'science'],
  },
  {
    id: 4, title: 'Ubuzima Bwiza', author: 'Dr. Jean-Marie Nkusi',
    cover: null, language: 'rw', category: 'health', pages: 124, progress: 80,
    hasAudio: true, hasTranslation: true, rating: 4.7, readers: 5600,
    description: 'Inama z\'ubuzima bwiza ku muryango w\'Umunyarwanda — uburyo bw\'imibereho myiza.',
    tags: ['health', 'kinyarwanda', 'wellness'],
  },
  {
    id: 5, title: 'The Alchemist', author: 'Paulo Coelho',
    cover: 'https://covers.openlibrary.org/b/id/8321848-L.jpg',
    language: 'en', category: 'fiction', pages: 197, progress: 100,
    hasAudio: true, hasTranslation: true, rating: 4.5, readers: 19600,
    description: 'A magical story about following your dreams and listening to your heart.',
    tags: ['fiction', 'philosophy', 'inspirational'],
  },
  {
    id: 6, title: 'Ubuhinzi n\'Iterambere', author: 'MINAGRI Rwanda',
    cover: null, language: 'rw', category: 'agriculture', pages: 96, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.4, readers: 2800,
    description: 'Inyigisho z\'ubuhinzi bwiza n\'iterambere ry\'umuhinzi w\'Umunyarwanda.',
    tags: ['agriculture', 'kinyarwanda', 'farming'],
  },
  {
    id: 7, title: 'Think and Grow Rich', author: 'Napoleon Hill',
    cover: 'https://covers.openlibrary.org/b/id/8231627-L.jpg',
    language: 'en', category: 'business', pages: 238, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.6, readers: 22000,
    description: 'Discover the secrets of success and financial freedom used by the world\'s greatest achievers.',
    tags: ['business', 'success', 'finance'],
  },
  {
    id: 8, title: 'Imitego y\'Ubuzima', author: 'Dr. Alice Mukamana',
    cover: null, language: 'rw', category: 'health', pages: 150, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.6, readers: 3100,
    description: 'Inyigisho z\'ubuzima bwiza ku bana no ku nzirakarengane z\'u Rwanda.',
    tags: ['health', 'kinyarwanda', 'family'],
  },
  {
    id: 9, title: '1984', author: 'George Orwell',
    cover: 'https://covers.openlibrary.org/b/id/10521270-L.jpg',
    language: 'en', category: 'fiction', pages: 328, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.7, readers: 25000,
    description: 'A dystopian masterpiece about surveillance, power, and the resilience of the human spirit.',
    tags: ['fiction', 'dystopia', 'classic'],
  },
  {
    id: 10, title: 'A Brief History of Time', author: 'Stephen Hawking',
    cover: 'https://covers.openlibrary.org/b/id/8276209-L.jpg',
    language: 'en', category: 'science', pages: 212, progress: 0,
    hasAudio: true, hasTranslation: false, rating: 4.6, readers: 18000,
    description: 'A landmark volume in science writing by one of the great minds of our time.',
    tags: ['science', 'physics', 'cosmology'],
  },
  {
    id: 11, title: 'Ikigai', author: 'Héctor García',
    cover: 'https://covers.openlibrary.org/b/id/10220959-L.jpg',
    language: 'en', category: 'education', pages: 208, progress: 0,
    hasAudio: true, hasTranslation: true, rating: 4.5, readers: 11000,
    description: 'The Japanese secret to a long and happy life — find your reason for being.',
    tags: ['education', 'philosophy', 'life'],
  },
  {
    id: 12, title: 'Uburezi n\'Iterambere', author: 'Dr. Emmanuel Habimana',
    cover: null, language: 'rw', category: 'education', pages: 180, progress: 20,
    hasAudio: true, hasTranslation: true, rating: 4.5, readers: 2100,
    description: 'Inzira y\'uburezi bwiza n\'iterambere ry\'abana mu Rwanda — amahitamo y\'ubutegetsi.',
    tags: ['education', 'kinyarwanda', 'development'],
  },
];

export const MOCK_STATS = {
  booksRead: 14, listeningHours: 38, streak: 7, level: 'Avid Reader',
  weeklyReadingMinutes: [25, 40, 30, 55, 45, 60, 35],
  categoryBreakdown: [
    { name: 'Education', value: 30 }, { name: 'Fiction', value: 25 },
    { name: 'Health',    value: 25 }, { name: 'Business', value: 20 },
  ],
};

export const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'recommendation', message: 'New book recommended: "Thinking Fast and Slow"', time: '2m ago',  read: false },
  { id: 2, type: 'audio',          message: 'Audio for "Sapiens" is ready to listen',           time: '1h ago',  read: false },
  { id: 3, type: 'translation',    message: 'Translation complete: "Ubuzima Bwiza" → English',  time: '3h ago',  read: true  },
  { id: 4, type: 'milestone',      message: '🎉 You completed 7-day reading streak!',            time: '1d ago',  read: true  },
];

export const MOCK_USER = {
  id: 1, name: 'Anne Louange', email: 'yasriyag9@gmail.com',
  avatar: null, language: 'en', joinedAt: '2024-01-15',
  booksRead: 14, savedBooks: 6,
};

export const SAMPLE_TEXT = `Once upon a time, in a land where stories lived in every leaf and stone, there was a great digital library at the heart of a village. This library held books in English and Kinyarwanda — every story, every lesson, every dream.

The villagers would come from far and near to read, to listen, and to learn. Some came to find wisdom in the pages of ancient tales. Others came to hear the voices of distant lands through the gift of audio narration.

On the highest shelf lived a very special book — one that could translate itself into any language simply by being read aloud. The children loved this book most of all, for it taught them that all stories are one story, and all languages are one language: the language of the human heart.

The library keeper, an elderly woman named Amara, understood this truth better than anyone. "Books are bridges," she would say. "They carry you from where you are to where you need to be."

And so the digital library grew, one story at a time, one reader at a time, until its light reached every corner of the world.`;
