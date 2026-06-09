import config from '../config.js';

const isProduction = config.isProduction;
const isDevelopment = !isProduction;

export const securityHeaders = (request, response, next) => {
  response.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:5000 http://localhost:3000 http://127.0.0.1:*",
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Permitted-Cross-Domain-Policies': 'none',
  });

  if (isProduction) {
    response.set('Expect-CT', 'max-age=86400, enforce');
  }

  next();
};

export const rateLimitStore = new Map();

const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
};

setInterval(cleanupExpiredEntries, 60000);

export const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (request, response, next) => {
    const key = request.ip || request.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);
    if (record.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
      response.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    response.set('X-RateLimit-Limit', maxRequests);
    response.set('X-RateLimit-Remaining', maxRequests - record.count);
    response.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .substring(0, 10000);
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  if (email.length > 254) return false;
  const [localPart] = email.split('@');
  if (localPart.length > 64) return false;
  return true;
};

export const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (password.length > 128) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[0-9]{9,15}$/;
  const cleanPhone = String(phone).replace(/[^\d+]/g, '');
  return phoneRegex.test(cleanPhone);
};

export const requestLogger = (request, response, next) => {
  const startTime = Date.now();
  const originalJson = response.json;

  response.json = function (data) {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.path,
      status: response.statusCode,
      duration: `${duration}ms`,
      ip: request.ip || request.connection.remoteAddress,
      userId: request.headers['user-id'] || 'anonymous',
    };

    if (isDevelopment) {
      console.log('[API]', JSON.stringify(logEntry));
    }

    return originalJson.call(this, data);
  };

  next();
};

export const validateRequestBody = (maxSize = 1000) => {
  return (request, response, next) => {
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize * 1024) {
        request.pause();
        response.status(413).json({
          success: false,
          message: 'Request body too large',
        });
      }
    });

    next();
  };
};

export const asyncHandler = (fn) => (request, response, next) => {
  Promise.resolve(fn(request, response, next)).catch(next);
};

export const authenticationMiddleware = (tokenService) => {
  return (request, response, next) => {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : request.cookies?.ml_auth_token;

    if (!token) {
      return response.status(401).json({
        success: false,
        message: 'Unauthorized',
        code: 'NO_TOKEN',
      });
    }

    const result = tokenService.verifyToken(token);
    if (!result.success) {
      return response.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    request.user = result.data;
    next();
  };
};

export const errorHandler = (err, request, response, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: request.path,
    method: request.method,
  });

  if (err.name === 'ValidationError') {
    return response.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors || {},
    });
  }

  if (err.name === 'UnauthorizedError') {
    return response.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  if (err.code === 'MULTER_ERROR' || err.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({
      success: false,
      message: 'File too large',
    });
  }

  response.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
};

export const notFoundHandler = (request, response) => {
  response.status(404).json({
    success: false,
    message: 'Not found',
    path: request.path,
  });
};
