import bcrypt from 'bcryptjs';
import config from '../config.js';

const cookieOptions = (days = 7) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
  maxAge: days * 24 * 60 * 60 * 1000,
});

export default class AuthService {
  constructor({ userRepository, emailService, tokenService, smsService }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.tokenService = tokenService;
    this.smsService = smsService;
  }

  isDevelopment() {
    return !config.isProduction;
  }

  normalizePhone(phone) {
    const trimmed = String(phone || '').trim();
    const digits = trimmed.replace(/\D+/g, '');

    if (!digits) {
      return '';
    }

    if (digits.startsWith('250')) {
      return `+${digits}`;
    }

    if (digits.startsWith('0') && digits.length === 10) {
      return `+250${digits.slice(1)}`;
    }

    if (digits.length === 9) {
      return `+250${digits}`;
    }

    if (trimmed.startsWith('+')) {
      return `+${digits}`;
    }

    return trimmed;
  }

  isValidPhone(phone) {
    return /^\+?[0-9]{9,15}$/.test(phone);
  }

  buildVerificationPayload(emailResult, code, codeExpiry) {
    const payload = {
      next_step: 'verify_email',
      email_delivery: emailResult.success ? 'sent' : 'failed',
    };

    if (this.isDevelopment()) {
      payload.verification_code = code;
      payload.verification_expires_at = codeExpiry;
    }

    if (!emailResult.success) {
      payload.email_error = emailResult.error || emailResult.message || 'Email delivery failed';
    }

    return payload;
  }

  buildGuestVerificationPayload(smsResult, phone, code, codeExpiry) {
    const payload = {
      next_step: 'verify_phone',
      phone,
      sms_delivery: smsResult.delivery || (smsResult.success ? 'sent' : 'failed'),
    };

    if (this.isDevelopment()) {
      payload.verification_code = code;
      payload.verification_expires_at = codeExpiry;
    }

    if (!smsResult.success) {
      payload.sms_error = smsResult.error || smsResult.message || 'SMS delivery failed';
    }

    return payload;
  }

  guestVerificationMessage(deliveryMode, resent = false) {
    if (deliveryMode === 'live') {
      return resent ? 'A new verification SMS has been sent to your phone.' : 'Guest sign-in started. Check your phone for the verification code.';
    }

    if (deliveryMode === 'sandbox') {
      return resent
        ? 'A new verification SMS was sent to the sandbox simulator, not a real phone.'
        : 'Guest sign-in started. The SMS provider is in sandbox mode, so the message goes to the simulator instead of your phone.';
    }

    if (deliveryMode === 'simulated' || deliveryMode === 'unconfigured' || deliveryMode === 'failed') {
      return resent
        ? 'Real SMS delivery is not configured on this server yet. The verification message was only simulated for development.'
        : 'Guest sign-in started, but real SMS delivery is not configured on this server yet. No phone message will arrive until live credentials are added.';
    }

    return resent ? 'A new verification SMS has been prepared.' : 'Guest sign-in started. Check your phone for the verification code.';
  }

  setAuthCookie(response, token, days = 7) {
    response.cookie('ml_auth_token', token, cookieOptions(days));
  }

  clearAuthCookie(response) {
    response.clearCookie('ml_auth_token', { ...cookieOptions(0), maxAge: undefined, expires: new Date(0) });
  }

  async issueVerificationCode(userId, email, name) {
    const code = this.tokenService.generateVerificationCode();
    const codeExpiry = this.tokenService.getVerificationCodeExpiry();

    await this.userRepository.setVerificationToken(userId, code, codeExpiry);
    const emailResult = await this.emailService.sendVerificationEmail(userId, email, name, code);

    return {
      success: true,
      email_sent: emailResult.success,
      payload: this.buildVerificationPayload(emailResult, code, codeExpiry),
    };
  }

  async issueGuestVerificationCode(userId, phone) {
    const code = this.tokenService.generateVerificationCode();
    const codeExpiry = this.tokenService.getVerificationCodeExpiry();

    await this.userRepository.setVerificationToken(userId, code, codeExpiry);
    const smsResult = await this.smsService.sendGuestVerificationCode(userId, phone, code);

    return {
      success: true,
      sms_sent: smsResult.success,
      payload: this.buildGuestVerificationPayload(smsResult, phone, code, codeExpiry),
    };
  }

  async register(name, email, password, phone = null) {
    if (!name || !email || !password) {
      return { success: false, message: 'Name, email, and password are required', code: 'MISSING_FIELDS' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, message: 'Invalid email format', code: 'INVALID_EMAIL' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' };
    }

    if (await this.userRepository.emailExists(email)) {
      return { success: false, message: 'Email already registered', code: 'EMAIL_EXISTS' };
    }

    const createResult = await this.userRepository.createUser(name, email, password, phone);
    const userId = createResult.user_id;
    const verificationResult = await this.issueVerificationCode(userId, email, name);
    await this.userRepository.logActivity(userId, 'registration', { email });

    return {
      success: true,
      message: verificationResult.email_sent
        ? 'Registration successful. Please check your email to verify.'
        : 'Registration successful. Email delivery failed, but the verification code is available for development testing.',
      data: {
        user_id: userId,
        email,
        ...verificationResult.payload,
      },
    };
  }

  async registerGuest(phone) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      return { success: false, message: 'Phone number is required', code: 'MISSING_PHONE' };
    }

    if (!this.isValidPhone(normalizedPhone)) {
      return { success: false, message: 'Invalid phone format', code: 'INVALID_PHONE' };
    }

    const existingUser = await this.userRepository.getUserByPhone(normalizedPhone);
    if (existingUser && !existingUser.is_guest) {
      return { success: false, message: 'This phone number is already linked to a full account', code: 'PHONE_LINKED_TO_ACCOUNT' };
    }

    const userId = existingUser ? existingUser.id : (await this.userRepository.createGuestUser(normalizedPhone)).user_id;
    const verificationResult = await this.issueGuestVerificationCode(userId, normalizedPhone);
    await this.userRepository.logActivity(userId, 'guest_verification_requested', { phone: normalizedPhone });

    return {
      success: true,
      message: this.guestVerificationMessage(verificationResult.payload.sms_delivery, false),
      data: {
        user_id: userId,
        user_type: 'guest',
        ...verificationResult.payload,
      },
    };
  }

  async verifyGuestPhone(phone, code, response) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone || !code) {
      return { success: false, message: 'Phone number and verification code are required', code: 'MISSING_FIELDS' };
    }

    const user = await this.userRepository.getUserByPhone(normalizedPhone);
    if (!user || !user.is_guest) {
      return { success: false, message: 'Guest user not found', code: 'USER_NOT_FOUND' };
    }

    const verifyResult = await this.userRepository.verifyGuestPhone(user.id, normalizedPhone, code);
    if (!verifyResult.success) {
      return { success: false, message: verifyResult.message, code: 'INVALID_CODE' };
    }

    await this.userRepository.createNotificationPreferences(user.id);
    const token = this.tokenService.generateToken(user.id, normalizedPhone, 'guest');
    this.setAuthCookie(response, token);
    await this.userRepository.logActivity(user.id, 'guest_phone_verified', { phone: normalizedPhone });
    const freshUser = await this.userRepository.getUserById(user.id);

    return {
      success: true,
      message: 'Phone verified successfully',
      data: {
        token,
        user: this.userRepository.getSafeUserData(freshUser || { ...user, is_verified: 1 }),
      },
    };
  }

  async resendGuestVerification(phone) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      return { success: false, message: 'Phone number is required', code: 'MISSING_PHONE' };
    }

    const user = await this.userRepository.getUserByPhone(normalizedPhone);
    if (!user || !user.is_guest) {
      return { success: false, message: 'Guest user not found', code: 'USER_NOT_FOUND' };
    }

    const verificationResult = await this.issueGuestVerificationCode(user.id, normalizedPhone);
    await this.userRepository.logActivity(user.id, 'guest_verification_resent', { phone: normalizedPhone });

    return {
      success: true,
      message: this.guestVerificationMessage(verificationResult.payload.sms_delivery, true),
      data: {
        phone: normalizedPhone,
        ...verificationResult.payload,
      },
    };
  }

  async verifyEmail(email, code, response) {
    if (!email || !code) {
      return { success: false, message: 'Email and verification code required', code: 'MISSING_FIELDS' };
    }

    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    if (user.is_verified) {
      return { success: false, message: 'Email already verified', code: 'ALREADY_VERIFIED' };
    }

    const verifyResult = await this.userRepository.verifyEmail(user.id, code);
    if (!verifyResult.success) {
      return { success: false, message: verifyResult.message, code: 'INVALID_CODE' };
    }

    await this.userRepository.createNotificationPreferences(user.id);
    await this.emailService.sendWelcomeEmail(user.id, email, user.full_name);
    const token = this.tokenService.generateToken(user.id, email, user.role || 'client');
    this.setAuthCookie(response, token);
    await this.userRepository.logActivity(user.id, 'email_verified');
    const freshUser = await this.userRepository.getUserById(user.id);

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        user: this.userRepository.getSafeUserData(freshUser || { ...user, is_verified: 1 }),
      },
    };
  }

  async login(email, password, rememberMe, response) {
    if (!email || !password) {
      return { success: false, message: 'Email and password required', code: 'MISSING_FIELDS' };
    }

    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
    }

    if (!user.is_verified) {
      return { success: false, message: 'Please verify your email first', code: 'EMAIL_NOT_VERIFIED' };
    }

    const validPassword = await this.userRepository.verifyPassword(password, user.password);
    if (!validPassword) {
      return { success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
    }

    await this.userRepository.updateLastLogin(user.id);
    const token = this.tokenService.generateToken(user.id, email, user.role || 'client');
    this.setAuthCookie(response, token, rememberMe ? 30 : 7);
    await this.userRepository.logActivity(user.id, 'login');

    return {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: this.userRepository.getSafeUserData(user),
      },
    };
  }

  async getCurrentUser(token) {
    if (!token) {
      return { success: false, message: 'Token required', code: 'MISSING_TOKEN' };
    }

    const tokenResult = this.tokenService.verifyToken(token);
    if (!tokenResult.success) {
      return tokenResult;
    }

    const user = await this.userRepository.getUserById(tokenResult.data.userId);
    if (!user) {
      return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    return { success: true, data: this.userRepository.getSafeUserData(user) };
  }

  async resendVerification(email) {
    if (!email) {
      return { success: false, message: 'Email is required', code: 'MISSING_EMAIL' };
    }

    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    if (user.is_verified) {
      return { success: false, message: 'Email already verified', code: 'ALREADY_VERIFIED' };
    }

    const verificationResult = await this.issueVerificationCode(user.id, email, user.full_name);
    return {
      success: true,
      message: verificationResult.email_sent
        ? 'Verification email sent'
        : 'Verification code regenerated. Email delivery failed, but the code is available for development testing.',
      data: {
        email,
        ...verificationResult.payload,
      },
    };
  }

  async requestPasswordReset(email) {
    if (!email) {
      return { success: false, message: 'Email is required', code: 'MISSING_EMAIL' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, message: 'Invalid email format', code: 'INVALID_EMAIL' };
    }

    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        code: 'RESET_SENT',
      };
    }

    const resetCode = this.tokenService.generateVerificationCode();
    const resetCodeExpiry = this.tokenService.getVerificationCodeExpiry(3600);
    await this.userRepository.setPasswordResetToken(user.id, resetCode, resetCodeExpiry);
    const emailResult = await this.emailService.sendPasswordResetEmail(user.id, email, user.full_name, resetCode);
    await this.userRepository.logActivity(user.id, 'password_reset_requested');

    const data = {
      email,
      email_sent: emailResult.success,
    };

    if (this.isDevelopment()) {
      data.reset_code = resetCode;
      data.reset_expires_at = resetCodeExpiry;
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      code: 'RESET_SENT',
      data,
    };
  }

  async resetPassword(email, resetCode, newPassword) {
    if (!email || !resetCode || !newPassword) {
      return { success: false, message: 'Email, reset code, and new password are required', code: 'MISSING_FIELDS' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' };
    }

    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const verifyResult = await this.userRepository.verifyPasswordResetToken(user.id, resetCode);
    if (!verifyResult.success) {
      return { success: false, message: verifyResult.message || 'Invalid or expired reset code', code: 'INVALID_CODE' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedPassword);
    await this.userRepository.logActivity(user.id, 'password_reset_completed');

    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      code: 'PASSWORD_RESET',
    };
  }

  async logout(token, response) {
    if (token) {
      const currentUser = await this.getCurrentUser(token);
      if (currentUser.success) {
        await this.userRepository.logActivity(currentUser.data.id, 'logout');
      }
    }

    this.clearAuthCookie(response);
    return { success: true, message: 'Logout successful', data: {} };
  }
}
