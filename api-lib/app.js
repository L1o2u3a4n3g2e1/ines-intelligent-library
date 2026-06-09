import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import config from './config.js';
import { getPool, initializeDatabase, getDatabaseState } from './db.js';
import UserRepository from './repositories/userRepository.js';
import TokenService from './services/tokenService.js';
import EmailService from './services/emailService.js';
import SmsService from './services/smsService.js';
import AuthService from './services/authService.js';
import LibraryService from './services/libraryService.js';
import DemoAuthService from './services/demoAuthService.js';
import DemoLibraryService from './services/demoLibraryService.js';
import {
  securityHeaders,
  createRateLimiter,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validatePhone,
  requestLogger,
  asyncHandler,
  authenticationMiddleware,
  errorHandler,
  notFoundHandler,
} from './middleware/security.js';

const sendSuccess = (response, data = null, message = 'Success', statusCode = 200) => {
  response.status(statusCode).json({ success: true, message, data });
};

const sendError = (response, message = 'Error', statusCode = 400, errors = null) => {
  response.status(statusCode).json({ success: false, message, errors });
};

const sendValidationError = (response, errors) => {
  response.status(422).json({ success: false, message: 'Validation failed', errors });
};

const resolveToken = (request) => {
  const authHeader = request.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.cookies?.ml_auth_token || null;
};

const buildServices = () => {
  const pool = getPool();
  const userRepository = new UserRepository(pool);
  const tokenService = new TokenService();
  const emailService = new EmailService(userRepository);
  const smsService = new SmsService(userRepository);
  const authService = new AuthService({ userRepository, emailService, tokenService, smsService });
  const libraryService = new LibraryService(pool);
  const demoAuthService = new DemoAuthService(tokenService);
  const demoLibraryService = new DemoLibraryService();

  return { pool, userRepository, tokenService, emailService, smsService, authService, libraryService, demoAuthService, demoLibraryService };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSize },
});

const publicDir = path.join(process.cwd(), 'public');
const indexHtmlPath = path.join(publicDir, 'index.html');
const schemaReady = initializeDatabase();
const services = buildServices();
const isDemoMode = () => getDatabaseState().mode === 'demo';

const resolveAuthService = () => (isDemoMode() ? services.demoAuthService : services.authService);

const resolveLibraryService = () => (isDemoMode() ? services.demoLibraryService : services.libraryService);

const getCurrentUserResult = async (request) => {
  const token = resolveToken(request);
  if (!token) {
    return null;
  }

  const authService = resolveAuthService();
  return authService.getCurrentUser(token);
};

const buildRuntimeReadiness = () => {
  const databaseState = getDatabaseState();
  const checks = {
    database: {
      required: true,
      ready: databaseState.mode === 'database',
      reason:
        databaseState.mode === 'database'
          ? null
          : config.database.configured
            ? databaseState.error || 'Database connection failed'
            : 'Missing DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE',
    },
    email: {
      required: false,
      ready: Boolean(config.mail.configured),
      reason: config.mail.configured ? null : 'Missing MAIL_HOST, MAIL_USERNAME, or MAIL_PASSWORD (optional)',
    },
    sms: {
      required: false,
      ready: Boolean(config.sms.configured),
      reason: config.sms.configured ? null : 'Missing Africa\'s Talking credentials or SMS_PROVIDER=africastalking (optional)',
    },
    jwt: {
      required: false,
      ready: Boolean(config.jwtConfigured),
      reason: config.jwtConfigured ? null : 'JWT_SECRET is still using the default placeholder (optional)',
    },
  };

  return {
    ready: Object.values(checks).every((check) => check.ready || !check.required),
    checks,
  };
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(requestLogger);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(publicDir));

app.use(createRateLimiter(100, 15 * 60 * 1000));

app.use(async (request, response, next) => {
  try {
    await schemaReady;
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (_request, response) => {
  const databaseState = getDatabaseState();
  const readiness = buildRuntimeReadiness();
  if (databaseState.mode === 'demo') {
    sendSuccess(
      response,
      {
        status: 'ok',
        database: 'disconnected',
        mode: 'demo',
        message: databaseState.error || 'Running in demo mode',
        production_ready: readiness.ready,
        readiness: readiness.checks,
      },
      'Digital Library API is running'
    );
    return;
  }

  const [rows] = await services.pool.query('SELECT 1 AS ok');
  sendSuccess(
    response,
    {
      status: 'ok',
      database: rows[0]?.ok === 1 ? 'connected' : 'unknown',
      mode: 'database',
      production_ready: readiness.ready,
      readiness: readiness.checks,
    },
    'Digital Library API is running'
  );
});

app.get('/api/health/ready', (_request, response) => {
  const readiness = buildRuntimeReadiness();
  sendSuccess(
    response,
    {
      app_env: config.appEnv,
      production_ready: readiness.ready,
      mode: isDemoMode() ? 'demo' : 'database',
      checks: readiness.checks,
    },
    readiness.ready ? 'Production dependencies are configured' : 'Production dependencies are incomplete'
  );
});

app.post('/api/auth/register', asyncHandler(async (request, response) => {
  const { name = '', email = '', password = '', phone = null } = request.body || {};
  const errors = {};

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim();
  const trimmedPassword = String(password || '');
  const trimmedPhone = phone ? String(phone).trim() : null;

  if (!trimmedName) errors.name = 'Name is required';
  else if (trimmedName.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (trimmedName.length > 255) errors.name = 'Name must not exceed 255 characters';

  if (!trimmedEmail) errors.email = 'Email is required';
  else if (!validateEmail(trimmedEmail)) errors.email = 'Invalid email format';

  if (!trimmedPassword) errors.password = 'Password is required';
  else if (trimmedPassword.length < 8) errors.password = 'Password must be at least 8 characters';

  if (Object.keys(errors).length) {
    return sendValidationError(response, errors);
  }

  const result = await resolveAuthService().register(
    sanitizeInput(trimmedName),
    trimmedEmail.toLowerCase(),
    trimmedPassword,
    trimmedPhone
  );

  return result.success
    ? sendSuccess(response, result.data, result.message, 201)
    : sendError(response, result.message, 400, { code: result.code || null });
}));

app.post('/api/auth/register-guest', asyncHandler(async (request, response) => {
  const phone = String(request.body?.phone || '').trim();

  if (!phone) {
    return sendValidationError(response, { phone: 'Phone number is required' });
  }

  if (!validatePhone(phone)) {
    return sendValidationError(response, { phone: 'Invalid phone number format' });
  }

  if (phone.length > 20) {
    return sendValidationError(response, { phone: 'Phone number too long' });
  }

  const result = await resolveAuthService().registerGuest(phone);
  return result.success
    ? sendSuccess(response, result.data, result.message, 201)
    : sendError(response, result.message, 400, { code: result.code || null });
}));

app.post('/api/auth/verify-guest-phone', asyncHandler(async (request, response) => {
  const phone = String(request.body?.phone || '').trim();
  const code = String(request.body?.code || '').trim();
  const errors = {};

  if (!phone) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (!code) {
    errors.code = 'Verification code is required';
  } else if (!/^\d{6}$/.test(code)) {
    errors.code = 'Verification code must be 6 digits';
  }

  if (Object.keys(errors).length) {
    return sendValidationError(response, errors);
  }

  const result = await resolveAuthService().verifyGuestPhone(phone, code, response);
  const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : result.success ? 200 : 400;
  return result.success
    ? sendSuccess(response, result.data, result.message, statusCode)
    : sendError(response, result.message, statusCode, { code: result.code || null });
}));

app.post('/api/auth/verify-email', asyncHandler(async (request, response) => {
  const email = String(request.body?.email || '').trim();
  const code = String(request.body?.code || '').trim();
  const errors = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Invalid email format';
  }

  if (!code) {
    errors.code = 'Verification code is required';
  } else if (!/^\d{6}$/.test(code)) {
    errors.code = 'Verification code must be 6 digits';
  }

  if (Object.keys(errors).length) {
    return sendValidationError(response, errors);
  }

  const result = await resolveAuthService().verifyEmail(email.toLowerCase(), code, response);
  const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : result.success ? 200 : 400;
  return result.success
    ? sendSuccess(response, result.data, result.message, statusCode)
    : sendError(response, result.message, statusCode, { code: result.code || null });
}));

app.post('/api/auth/login', asyncHandler(async (request, response) => {
  const email = String(request.body?.email || '').trim();
  const password = String(request.body?.password || '');
  const rememberMe = Boolean(request.body?.remember_me);
  const errors = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Invalid email format';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length > 128) {
    errors.password = 'Invalid password';
  }

  if (Object.keys(errors).length) {
    return sendValidationError(response, errors);
  }

  const result = await resolveAuthService().login(email.toLowerCase(), password, rememberMe, response);
  return result.success
    ? sendSuccess(response, result.data, result.message)
    : sendError(response, result.message, 401, { code: result.code || null });
}));

app.get('/api/auth/me', async (request, response) => {
  const token = resolveToken(request);
  if (!token) return sendError(response, 'Unauthorized - Token required', 401, { code: 'NO_TOKEN' });
  const result = await resolveAuthService().getCurrentUser(token);
  return result.success ? sendSuccess(response, result.data, 'User retrieved') : sendError(response, result.message, 401, { code: result.code || null });
});

app.post('/api/auth/resend-verification', asyncHandler(async (request, response) => {
  const email = String(request.body?.email || '').trim();

  if (!email) {
    return sendValidationError(response, { email: 'Email is required' });
  }

  if (!validateEmail(email)) {
    return sendValidationError(response, { email: 'Invalid email format' });
  }

  const result = await resolveAuthService().resendVerification(email.toLowerCase());
  const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : result.success ? 200 : 400;
  return result.success
    ? sendSuccess(response, result.data, result.message, statusCode)
    : sendError(response, result.message, statusCode, { code: result.code || null });
}));

app.post('/api/auth/resend-guest-verification', asyncHandler(async (request, response) => {
  const phone = String(request.body?.phone || '').trim();

  if (!phone) {
    return sendValidationError(response, { phone: 'Phone number is required' });
  }

  if (!validatePhone(phone)) {
    return sendValidationError(response, { phone: 'Invalid phone number format' });
  }

  if (phone.length > 20) {
    return sendValidationError(response, { phone: 'Phone number too long' });
  }

  const result = await resolveAuthService().resendGuestVerification(phone);
  const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : result.success ? 200 : 400;
  return result.success
    ? sendSuccess(response, result.data, result.message, statusCode)
    : sendError(response, result.message, statusCode, { code: result.code || null });
}));

app.post('/api/auth/logout', async (request, response) => {
  const result = await resolveAuthService().logout(resolveToken(request), response);
  return sendSuccess(response, result.data, result.message);
});

app.post('/api/auth/forgot-password', async (request, response) => {
  const email = String(request.body?.email || '').trim();
  if (!email) return sendValidationError(response, { email: 'Email is required' });
  const result = await resolveAuthService().requestPasswordReset(email);
  return result.success ? sendSuccess(response, result.data || {}, result.message) : sendError(response, result.message, 400, { code: result.code || null });
});

app.post('/api/auth/reset-password', async (request, response) => {
  const email = String(request.body?.email || '').trim();
  const resetCode = String(request.body?.reset_code || '').trim();
  const newPassword = String(request.body?.new_password || '');
  const errors = {};
  if (!email) errors.email = 'Email is required';
  if (!resetCode) errors.reset_code = 'Reset code is required';
  if (!newPassword) errors.new_password = 'New password is required';
  if (newPassword && newPassword.length < 6) errors.new_password = 'Password must be at least 6 characters';
  if (Object.keys(errors).length) return sendValidationError(response, errors);
  const result = await resolveAuthService().resetPassword(email, resetCode, newPassword);
  return result.success ? sendSuccess(response, {}, result.message) : sendError(response, result.message, result.code === 'USER_NOT_FOUND' ? 404 : 400, { code: result.code || null });
});

app.get('/api/books', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const preferredLanguage = request.headers['x-app-language'] || request.query.language || null;
  const books = await libraryService.listBooks(userResult?.success ? userResult.data.id : null, preferredLanguage, request);
  return sendSuccess(response, books);
});

app.get('/api/books/search', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const userId = userResult?.success ? userResult.data.id : null;
  const query = String(request.query.q || '').trim();
  if (query) {
    await libraryService.recordSearch(userId, query, request.query.lang || request.headers['x-app-language'] || null, request, response);
  }
  const books = await libraryService.searchBooks(request.query, userId, request.headers['x-app-language'] || request.query.language || null, request);
  return sendSuccess(response, books);
});

app.get('/api/books/recommended', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const books = await libraryService.recommendedBooks(userResult?.success ? userResult.data.id : null, request.headers['x-app-language'] || null, request);
  return sendSuccess(response, books);
});

app.get('/api/books/:id', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const userId = userResult?.success ? userResult.data.id : null;
  const book = await libraryService.getBook(request.params.id, userId, request);
  if (!book) return sendError(response, 'Book not found', 404);
  await libraryService.recordBookView(userId, book, request, response);
  return sendSuccess(response, book);
});

app.post('/api/upload/book', upload.single('file'), async (request, response) => {
  if (!request.file) return sendValidationError(response, { file: 'Book file is required' });
  const extension = path.extname(request.file.originalname).toLowerCase();
  if (!['.pdf', '.txt'].includes(extension)) {
    return sendValidationError(response, { file: 'Only PDF and TXT files are supported' });
  }

  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const createdBook = await libraryService.createUploadedBook({
    file: request.file,
    body: request.body || {},
    currentUserId: userResult?.success ? userResult.data.id : null,
    request,
    response,
  });

  return sendSuccess(response, createdBook, 'Book uploaded successfully', 201);
});

app.post('/api/upload/cover', upload.single('file'), async (request, response) => {
  if (!request.file) return sendValidationError(response, { file: 'Cover image is required' });
  const extension = path.extname(request.file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return sendValidationError(response, { file: 'Only JPG, PNG, and WEBP images are supported' });
  }

  const dataUrl = `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`;
  return sendSuccess(response, { path: dataUrl, size: request.file.size }, 'Cover uploaded successfully', 201);
});

app.post('/api/translate', async (request, response) => {
  const libraryService = resolveLibraryService();
  const { text = '', from = 'en', to = 'rw', bookId = null } = request.body || {};
  if (!String(text).trim()) return sendValidationError(response, { text: 'Text is required' });
  const translated = await libraryService.translateText(String(text), String(from), String(to), bookId, request);
  const userResult = await getCurrentUserResult(request);
  const book = bookId ? await libraryService.getBook(bookId, userResult?.success ? userResult.data.id : null, request) : null;
  await libraryService.recordTranslation(userResult?.success ? userResult.data.id : null, request.body || {}, book, request, response);
  return sendSuccess(response, { translated, from, to });
});

app.get('/api/translate/languages', (_request, response) => {
  return sendSuccess(response, [
    { code: 'en', label: 'English' },
    { code: 'rw', label: 'Kinyarwanda' },
  ]);
});

app.post('/api/audio/generate', async (request, response) => {
  const libraryService = resolveLibraryService();
  const book = await libraryService.getBook(request.body?.bookId, null, request);
  return sendSuccess(
    response,
    {
      book_id: request.body?.bookId,
      language: request.body?.lang || book?.language || 'en',
      status: 'browser_speech_ready',
    },
    'Audio ready for browser playback'
  );
});

app.get('/api/audio/:bookId', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const book = await libraryService.getBook(request.params.bookId, userResult?.success ? userResult.data.id : null, request);
  if (!book) return sendError(response, 'Book not found', 404);
  return sendSuccess(response, {
    book_id: request.params.bookId,
    status: 'browser_speech_ready',
    text: book.content?.[book.language] || Object.values(book.content || {})[0] || null,
  });
});

app.get('/api/stats', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  const stats = await libraryService.getStats(userResult?.success ? userResult.data.id : null, request);
  return sendSuccess(response, stats);
});

app.post('/api/stats/read', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  if (!userResult?.success) return sendError(response, 'Unauthorized', 401);
  const book = await libraryService.getBook(request.body?.bookId, userResult.data.id, request);
  const metrics = await libraryService.recordRead(userResult.data.id, request.body || {}, book, request, response);
  return sendSuccess(response, { book_id: request.body?.bookId, metrics }, 'Reading activity recorded');
});

app.post('/api/stats/audio', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  if (!userResult?.success) return sendError(response, 'Unauthorized', 401);
  const book = await libraryService.getBook(request.body?.bookId, userResult.data.id, request);
  await libraryService.recordAudio(userResult.data.id, request.body || {}, book, request, response);
  return sendSuccess(response, {}, 'Audio activity recorded');
});

app.post('/api/stats/voice', async (request, response) => {
  const libraryService = resolveLibraryService();
  const userResult = await getCurrentUserResult(request);
  if (!userResult?.success) return sendError(response, 'Unauthorized', 401);
  const detectedLanguage = request.body?.detected_language || libraryService.detectLanguage(request.body?.text || '');
  const payload = { ...(request.body || {}), detected_language: detectedLanguage };
  await libraryService.recordVoice(userResult.data.id, payload, request, response);
  return sendSuccess(response, { detected_language: detectedLanguage, text: String(request.body?.text || '').trim() }, 'Voice activity recorded');
});

app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(indexHtmlPath)) {
    return response.sendFile(indexHtmlPath);
  }

  return response.status(503).send('Frontend build not found. Run the frontend build before serving the app.');
});

app.use((request, response) => {
  if (request.path.startsWith('/api')) {
    return sendError(response, 'Not found', 404);
  }

  if (fs.existsSync(indexHtmlPath)) {
    return response.sendFile(indexHtmlPath);
  }

  return response.status(404).send('Not found');
});

app.use((error, request, response, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    message: error.message,
    path: request.path,
    method: request.method,
    ...(config.appEnv === 'development' && { stack: error.stack }),
  });

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendError(response, 'File too large', 413);
    }
    return sendError(response, 'File upload error', 400);
  }

  if (error.name === 'ValidationError') {
    return sendError(response, 'Validation error', 422);
  }

  if (error.name === 'UnauthorizedError') {
    return sendError(response, 'Unauthorized', 401);
  }

  const statusCode = error.status || error.statusCode || 500;
  const message = config.appEnv === 'development' ? error.message : 'Internal server error';

  return sendError(response, message, statusCode);
});

export default app;
