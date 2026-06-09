import fs from 'node:fs';
import path from 'node:path';

const catalogPath = path.join(process.cwd(), 'backend', 'data', 'library_catalog.json');
const resourcesPath = path.join(process.cwd(), 'backend', 'data', 'kinyarwanda_resources.json');

const readJsonFile = (filePath, fallback) => {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (parsed && typeof parsed === 'object' ? parsed : fallback);
  } catch {
    return fallback;
  }
};

const defaultMetrics = () => ({
  book_progress: {},
  reading_events: [],
  audio_events: [],
  searches: [],
  voice_events: [],
  translation_events: [],
  book_views: [],
});

const normalizeMetrics = (metrics) => ({
  ...defaultMetrics(),
  ...(metrics && typeof metrics === 'object' ? metrics : {}),
  book_progress: metrics?.book_progress && typeof metrics.book_progress === 'object' ? metrics.book_progress : {},
  reading_events: Array.isArray(metrics?.reading_events) ? metrics.reading_events : [],
  audio_events: Array.isArray(metrics?.audio_events) ? metrics.audio_events : [],
  searches: Array.isArray(metrics?.searches) ? metrics.searches : [],
  voice_events: Array.isArray(metrics?.voice_events) ? metrics.voice_events : [],
  translation_events: Array.isArray(metrics?.translation_events) ? metrics.translation_events : [],
  book_views: Array.isArray(metrics?.book_views) ? metrics.book_views : [],
});

const asArray = (value) => (Array.isArray(value) ? value : []);
const nowIso = () => new Date().toISOString();

export default class LibraryService {
  constructor(pool) {
    this.pool = pool;
    this.catalog = readJsonFile(catalogPath, []);
    this.resources = readJsonFile(resourcesPath, {
      glossary: {},
      kinyarwanda_markers: [],
      english_markers: [],
    });
  }

  async getUploadedBooks() {
    const [rows] = await this.pool.query('SELECT * FROM uploaded_books ORDER BY created_at DESC');
    return rows.map((row) => {
      let content = {};
      try {
        content = JSON.parse(row.content_json || '{}');
      } catch {
        content = { [row.language || 'en']: row.description || row.title };
      }

      const availableLanguages = Object.keys(content);
      return {
        id: `upload-${row.id}`,
        slug: `upload-${row.id}`,
        title: row.title,
        title_en: row.language === 'rw' ? row.title_en || null : null,
        author: row.author,
        description: row.description || '',
        category: row.category || 'general',
        language: row.language || availableLanguages[0] || 'en',
        available_languages: availableLanguages.length ? availableLanguages : [row.language || 'en'],
        cover: row.cover || '',
        hasAudio: Boolean(row.generated_audio),
        hasTranslation: Boolean(row.allow_translation),
        source_url: null,
        download_url: null,
        edition_type: 'user_upload',
        rating: 4.0,
        readers: 1,
        content,
        created_at: row.created_at,
      };
    });
  }

  async loadCombinedCatalog() {
    const uploaded = await this.getUploadedBooks();
    return [...this.catalog, ...uploaded];
  }

  async getUserMetrics(userId) {
    if (!userId) {
      return defaultMetrics();
    }

    const [rows] = await this.pool.execute('SELECT metrics FROM user_metrics WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows[0]) {
      const empty = defaultMetrics();
      await this.pool.execute(
        `INSERT INTO user_metrics (user_id, metrics, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET metrics = EXCLUDED.metrics, updated_at = NOW()`,
        [userId, JSON.stringify(empty)]
      );
      return empty;
    }

    try {
      return normalizeMetrics(JSON.parse(rows[0].metrics || '{}'));
    } catch {
      return defaultMetrics();
    }
  }

  async persistUserMetrics(userId, metrics) {
    if (!userId) {
      return;
    }

    const normalized = normalizeMetrics(metrics);
    await this.pool.execute(
      `INSERT INTO user_metrics (user_id, metrics, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET metrics = EXCLUDED.metrics, updated_at = NOW()`,
      [userId, JSON.stringify(normalized)]
    );
  }

  summarizeBookForUser(book, progressMap = {}) {
    const progressInfo = progressMap[String(book.id)] || {
      progress: 0,
      minutes: 0,
      completed: false,
      last_language: book.language,
    };

    return {
      ...book,
      progress: Number(progressInfo.progress || 0),
      minutes_read: Number(progressInfo.minutes || 0),
      completed: Boolean(progressInfo.completed),
      preferred_language: progressInfo.last_language || book.language,
    };
  }

  async listBooks(userId = null, preferredLanguage = null) {
    const books = await this.loadCombinedCatalog();
    const progressMap = userId ? (await this.getUserMetrics(userId)).book_progress || {} : {};

    const summarized = books.map((book) => this.summarizeBookForUser(book, progressMap));

    if (preferredLanguage) {
      summarized.sort((left, right) => {
        const leftScore = asArray(left.available_languages).includes(preferredLanguage) ? 1 : 0;
        const rightScore = asArray(right.available_languages).includes(preferredLanguage) ? 1 : 0;
        if (leftScore === rightScore) {
          return Number(right.rating || 0) - Number(left.rating || 0);
        }
        return rightScore - leftScore;
      });
    }

    return summarized;
  }

  async getBook(bookId, userId = null) {
    const books = await this.listBooks(userId);
    return books.find((book) => String(book.id) === String(bookId)) || null;
  }

  async searchBooks(queryParams = {}, userId = null, preferredLanguage = null) {
    const books = await this.listBooks(userId, preferredLanguage);
    const query = String(queryParams.q || '').trim().toLowerCase();
    const language = String(queryParams.lang || '').trim();
    const category = String(queryParams.category || '').trim();
    const hasAudio = queryParams.hasAudio;
    const sort = String(queryParams.sort || 'relevance').trim();

    const filtered = books.filter((book) => {
      if (query) {
        const haystack = [book.title, book.title_en, book.author, book.description, book.description_en]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (language && language !== 'all') {
        if (book.language !== language && !asArray(book.available_languages).includes(language)) {
          return false;
        }
      }

      if (category && category !== 'all' && book.category !== category) {
        return false;
      }

      if (hasAudio !== undefined && hasAudio !== '' && String(hasAudio) !== 'false' && !book.hasAudio) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      if (sort === 'rating') return Number(right.rating || 0) - Number(left.rating || 0);
      if (sort === 'popular') return Number(right.readers || 0) - Number(left.readers || 0);
      if (sort === 'newest') return String(right.id).localeCompare(String(left.id), undefined, { numeric: true });
      return Number(right.progress || 0) - Number(left.progress || 0);
    });

    return filtered;
  }

  async recommendedBooks(userId = null, preferredLanguage = null) {
    const books = await this.listBooks(userId, preferredLanguage);
    if (!userId) {
      return [...books].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 8);
    }

    const metrics = await this.getUserMetrics(userId);
    const categoryScores = {};

    for (const event of metrics.reading_events || []) {
      if (event.category) {
        categoryScores[event.category] = (categoryScores[event.category] || 0) + Number(event.minutes || 0);
      }
    }

    for (const event of metrics.book_views || []) {
      if (event.category) {
        categoryScores[event.category] = (categoryScores[event.category] || 0) + 2;
      }
    }

    return [...books]
      .sort((left, right) => {
        const leftScore = (categoryScores[left.category] || 0) + (Number(left.rating || 0) * 10) + (Number(left.progress || 0) / 10);
        const rightScore = (categoryScores[right.category] || 0) + (Number(right.rating || 0) * 10) + (Number(right.progress || 0) / 10);
        return rightScore - leftScore;
      })
      .slice(0, 8);
  }

  async recordBookView(userId, book) {
    if (!userId || !book) return;
    const metrics = await this.getUserMetrics(userId);
    metrics.book_views.push({ book_id: String(book.id), category: book.category, at: nowIso() });
    await this.persistUserMetrics(userId, metrics);
  }

  async recordRead(userId, payload, book = null) {
    if (!userId) return null;
    const metrics = await this.getUserMetrics(userId);
    const bookId = String(payload.bookId || '');
    const minutes = Math.max(0, Number(payload.minutes || 0));
    const progress = Math.max(0, Math.min(100, Number(payload.progress || 0)));
    const language = payload.language || book?.language || 'en';
    const completed = Boolean(payload.completed) || progress >= 100;

    if (!metrics.book_progress[bookId]) {
      metrics.book_progress[bookId] = {
        progress: 0,
        minutes: 0,
        completed: false,
        last_language: language,
      };
    }

    const target = metrics.book_progress[bookId];
    target.progress = Math.max(Number(target.progress || 0), progress);
    target.minutes = Number(target.minutes || 0) + minutes;
    target.completed = Boolean(target.completed) || completed;
    target.last_language = language;
    target.updated_at = nowIso();

    metrics.reading_events.push({
      book_id: bookId,
      category: book?.category || null,
      minutes,
      progress,
      language,
      at: nowIso(),
    });

    await this.persistUserMetrics(userId, metrics);
    return target;
  }

  async recordAudio(userId, payload, book = null) {
    if (!userId) return;
    const metrics = await this.getUserMetrics(userId);
    metrics.audio_events.push({
      book_id: String(payload.bookId || ''),
      category: book?.category || null,
      seconds: Math.max(0, Number(payload.seconds || 0)),
      language: payload.language || book?.language || 'en',
      at: nowIso(),
    });
    await this.persistUserMetrics(userId, metrics);
  }

  async recordVoice(userId, payload) {
    if (!userId) return;
    const metrics = await this.getUserMetrics(userId);
    metrics.voice_events.push({
      text: String(payload.text || '').trim(),
      detected_language: payload.detected_language || 'unknown',
      at: nowIso(),
    });
    await this.persistUserMetrics(userId, metrics);
  }

  async recordSearch(userId, query, language = null) {
    if (!userId || !query) return;
    const metrics = await this.getUserMetrics(userId);
    metrics.searches.push({ query, language: language || 'unknown', at: nowIso() });
    await this.persistUserMetrics(userId, metrics);
  }

  async recordTranslation(userId, payload, book = null) {
    if (!userId) return;
    const metrics = await this.getUserMetrics(userId);
    metrics.translation_events.push({
      book_id: String(payload.bookId || ''),
      category: book?.category || null,
      from: payload.from || 'en',
      to: payload.to || 'rw',
      length: String(payload.text || '').length,
      at: nowIso(),
    });
    await this.persistUserMetrics(userId, metrics);
  }

  detectLanguage(text) {
    const normalized = String(text || '').trim().toLowerCase();
    if (!normalized) return 'unknown';

    const rwMarkers = asArray(this.resources.kinyarwanda_markers);
    const enMarkers = asArray(this.resources.english_markers);

    let rwScore = 0;
    for (const marker of rwMarkers) {
      if (marker && new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'u').test(normalized)) {
        rwScore += 1;
      }
    }

    let enScore = 0;
    for (const marker of enMarkers) {
      if (marker && new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'u').test(normalized)) {
        enScore += 1;
      }
    }

    if (rwScore === 0 && enScore === 0) {
      return /[a-z]/u.test(normalized) ? 'en' : 'unknown';
    }

    if (Math.abs(rwScore - enScore) <= 1 && rwScore > 0 && enScore > 0) {
      return 'mixed';
    }

    return rwScore > enScore ? 'rw' : 'en';
  }

  buildWeeklyReadingMinutes(readingEvents) {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const event of readingEvents) {
      const date = new Date(event.at);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
      if (diffDays <= 0 && diffDays >= -6) {
        totals[6 + diffDays] += Number(event.minutes || 0);
      }
    }

    return totals;
  }

  calculateStreak(readingEvents, audioEvents) {
    const days = new Set();
    for (const event of [...readingEvents, ...audioEvents]) {
      days.add(new Date(event.at).toISOString().slice(0, 10));
    }

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  async getStats(userId) {
    if (!userId) {
      return {
        booksRead: 0,
        booksStarted: 0,
        listeningHours: 0,
        streak: 0,
        weeklyReadingMinutes: [0, 0, 0, 0, 0, 0, 0],
        readingProgress: 0,
        totalReadingMinutes: 0,
        translationsUsed: 0,
        voiceCommands: 0,
        searchCount: 0,
        topCategory: null,
      };
    }

    const metrics = await this.getUserMetrics(userId);
    const progressMap = metrics.book_progress || {};
    const readingEvents = metrics.reading_events || [];
    const audioEvents = metrics.audio_events || [];
    const translationEvents = metrics.translation_events || [];

    const activeProgress = [];
    let booksRead = 0;
    let totalReadingMinutes = 0;
    let audioSeconds = 0;
    const categoryMinutes = {};

    for (const item of Object.values(progressMap)) {
      if (item.completed) booksRead += 1;
      if (item.progress) activeProgress.push(Number(item.progress));
    }

    for (const event of readingEvents) {
      const minutes = Math.max(0, Number(event.minutes || 0));
      totalReadingMinutes += minutes;
      if (event.category) {
        categoryMinutes[event.category] = (categoryMinutes[event.category] || 0) + minutes;
      }
    }

    for (const event of audioEvents) {
      audioSeconds += Math.max(0, Number(event.seconds || 0));
    }

    const topCategory = Object.entries(categoryMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      booksRead,
      booksStarted: Object.keys(progressMap).length,
      listeningHours: Number((audioSeconds / 3600).toFixed(1)),
      streak: this.calculateStreak(readingEvents, audioEvents),
      weeklyReadingMinutes: this.buildWeeklyReadingMinutes(readingEvents),
      readingProgress: activeProgress.length ? Math.round(activeProgress.reduce((sum, value) => sum + value, 0) / activeProgress.length) : 0,
      totalReadingMinutes,
      translationsUsed: translationEvents.length,
      voiceCommands: asArray(metrics.voice_events).length,
      searchCount: asArray(metrics.searches).length,
      topCategory,
    };
  }

  async translateText(text, from, to, bookId = null) {
    let value = String(text || '').trim();
    if (!value || from === to) {
      return value;
    }

    if (bookId) {
      const book = await this.getBook(bookId);
      if (book?.content?.[from] && book?.content?.[to]) {
        const sourceParagraphs = String(book.content[from]).split(/\n\s*\n/);
        const targetParagraphs = String(book.content[to]).split(/\n\s*\n/);
        for (let index = 0; index < sourceParagraphs.length; index += 1) {
          if (sourceParagraphs[index].includes(value) && targetParagraphs[index]) {
            return targetParagraphs[index];
          }
        }
      }
    }

    const glossary = this.resources.glossary || {};
    if (from === 'en' && to === 'rw') {
      for (const [english, kinyarwanda] of Object.entries(glossary)) {
        value = value.replace(new RegExp(`\\b${english.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi'), kinyarwanda);
      }
      return `[rw] ${value}`;
    }

    if (from === 'rw' && to === 'en') {
      for (const [english, kinyarwanda] of Object.entries(glossary)) {
        value = value.replace(new RegExp(`\\b${String(kinyarwanda).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'giu'), english);
      }
      return `[en] ${value}`;
    }

    return `[${to}] ${value}`;
  }

  async createUploadedBook({ file, body, currentUserId }) {
    const title = body.title || path.parse(file.originalname).name;
    const author = body.author || 'Unknown author';
    const language = body.language || 'en';
    const category = body.category || 'general';
    const description = body.description || '';
    const generateAudio = String(body.generateAudio || 'true') !== 'false';
    const allowTranslation = String(body.allowTranslation || 'true') !== 'false';

    let contentText = description || `${title} was uploaded successfully.`;
    if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
      contentText = file.buffer.toString('utf8').trim() || contentText;
    } else if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      contentText = `${description || title}\n\nPDF upload received. Text extraction is not enabled in the current serverless build, so this preview uses the provided metadata.`;
    }

    const content = { [language]: contentText };
    const [result] = await this.pool.execute(
      `INSERT INTO uploaded_books (
        title, author, description, category, language, content_json, cover, original_filename, mime_type, generated_audio, allow_translation, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        author,
        description,
        category,
        language,
        JSON.stringify(content),
        body.cover || null,
        file.originalname,
        file.mimetype,
        generateAudio ? 1 : 0,
        allowTranslation ? 1 : 0,
        currentUserId || null,
      ]
    );

    return this.getBook(`upload-${result.insertId}`, currentUserId || null);
  }
}
