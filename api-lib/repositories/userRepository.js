import bcrypt from 'bcryptjs';

const toMysqlDateTime = (value = new Date()) =>
  new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

const nowMysql = () => toMysqlDateTime();

export default class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser(name, email, password, phone = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await this.pool.execute(
      `INSERT INTO users (full_name, email, password, phone_number, is_verified, is_guest, created_at)
       VALUES (?, ?, ?, ?, 0, 0, NOW())`,
      [name, email, hashedPassword, phone]
    );

    return { success: true, user_id: result.insertId, message: 'User created successfully' };
  }

  async createGuestUser(phone) {
    const [result] = await this.pool.execute(
      `INSERT INTO users (full_name, phone_number, is_guest, is_verified, created_at)
       VALUES ('Guest Reader', ?, 1, 0, NOW())`,
      [phone]
    );

    return { success: true, user_id: result.insertId };
  }

  async emailExists(email) {
    const [rows] = await this.pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
  }

  async getUserByEmail(email) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }

  async getUserByPhone(phone) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE phone_number = ? LIMIT 1', [phone]);
    return rows[0] || null;
  }

  async getUserById(userId) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  }

  async setVerificationToken(userId, token, expiry) {
    await this.pool.execute(
      'UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE id = ?',
      [token, expiry, userId]
    );
    return true;
  }

  async verifyEmail(userId, token) {
    const [result] = await this.pool.execute(
      `UPDATE users
       SET is_verified = 1, verification_token = NULL, verification_token_expiry = NULL
       WHERE id = ? AND verification_token = ? AND verification_token_expiry > NOW()`,
      [userId, token]
    );

    return result.affectedRows > 0
      ? { success: true }
      : { success: false, message: 'Invalid or expired token' };
  }

  async verifyGuestPhone(userId, phone, token) {
    const [result] = await this.pool.execute(
      `UPDATE users
       SET is_verified = 1, verification_token = NULL, verification_token_expiry = NULL
       WHERE id = ? AND phone_number = ? AND is_guest = 1 AND verification_token = ? AND verification_token_expiry > NOW()`,
      [userId, phone, token]
    );

    return result.affectedRows > 0
      ? { success: true }
      : { success: false, message: 'Invalid or expired verification code' };
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword || '');
  }

  async updateLastLogin(userId) {
    await this.pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);
    return true;
  }

  async createNotificationPreferences(userId) {
    await this.pool.execute(
      `INSERT INTO notification_preferences (user_id, email_notifications, sms_notifications, notification_frequency)
       VALUES (?, 1, 0, 'instant')
       ON CONFLICT (user_id) DO UPDATE SET
         email_notifications = EXCLUDED.email_notifications,
         sms_notifications = EXCLUDED.sms_notifications,
         notification_frequency = EXCLUDED.notification_frequency,
         updated_at = NOW()`,
      [userId]
    );

    return true;
  }

  getSafeUserData(user) {
    return {
      id: user.id,
      name: user.full_name || 'Guest',
      email: user.email,
      phone: user.phone_number,
      is_guest: Boolean(user.is_guest),
      is_verified: Boolean(user.is_verified),
      role: user.role || 'client',
      preferred_language: user.preferred_language || 'en',
      dark_mode: Boolean(user.dark_mode),
      created_at: user.created_at,
      last_login: user.last_login,
    };
  }

  async logActivity(userId, activityType, details = null) {
    await this.pool.execute(
      `INSERT INTO user_activity (user_id, activity_type, details, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, activityType, details ? JSON.stringify(details) : null]
    );
    return true;
  }

  async setPasswordResetToken(userId, resetToken, expiryTime) {
    await this.pool.execute(
      'UPDATE users SET password_reset_token = ?, password_reset_expiry = ? WHERE id = ?',
      [resetToken, expiryTime, userId]
    );

    return { success: true };
  }

  async verifyPasswordResetToken(userId, resetToken) {
    const [rows] = await this.pool.execute(
      `SELECT id FROM users
       WHERE id = ? AND password_reset_token = ? AND password_reset_expiry > NOW()
       LIMIT 1`,
      [userId, resetToken]
    );

    return rows.length > 0
      ? { success: true }
      : { success: false, message: 'Invalid or expired reset token' };
  }

  async updatePassword(userId, hashedPassword) {
    await this.pool.execute(
      `UPDATE users
       SET password = ?, password_reset_token = NULL, password_reset_expiry = NULL, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    return { success: true };
  }

  async persistEmailLog({ userId = null, recipientEmail, subject, body, status = 'pending', errorMessage = null, sentAt = null }) {
    await this.pool.execute(
      `INSERT INTO email_logs (user_id, recipient_email, subject, body, status, error_message, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, recipientEmail, subject, body, status, errorMessage, sentAt]
    );
  }

  async persistSmsLog({ userId = null, recipientPhone, message, status = 'pending', errorMessage = null, sentAt = null }) {
    await this.pool.execute(
      `INSERT INTO sms_logs (user_id, recipient_phone, message, status, error_message, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, recipientPhone, message, status, errorMessage, sentAt]
    );
  }
}

export { nowMysql, toMysqlDateTime };
