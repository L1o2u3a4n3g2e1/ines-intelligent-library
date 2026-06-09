const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    password VARCHAR(255),
    phone_number VARCHAR(20) UNIQUE,
    is_guest SMALLINT NOT NULL DEFAULT 0,
    is_verified SMALLINT NOT NULL DEFAULT 0,
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expiry TIMESTAMPTZ,
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    dark_mode SMALLINT NOT NULL DEFAULT 0,
    preferences JSONB,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token)`,
  `CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users (password_reset_token)`,

  `CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    email_notifications SMALLINT NOT NULL DEFAULT 1,
    sms_notifications SMALLINT NOT NULL DEFAULT 0,
    notification_frequency VARCHAR(20) NOT NULL DEFAULT 'instant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity (activity_type)`,

  `CREATE TABLE IF NOT EXISTS user_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    metrics TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs (status)`,

  `CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs (status)`,

  `CREATE TABLE IF NOT EXISTS uploaded_books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    content_json TEXT NOT NULL,
    cover TEXT,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    generated_audio SMALLINT NOT NULL DEFAULT 1,
    allow_translation SMALLINT NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_books_created_by ON uploaded_books (created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_books_category ON uploaded_books (category)`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_books_language ON uploaded_books (language)`,
];

export const ensureSchema = async (pool) => {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }
};
