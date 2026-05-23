import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../config.js';
import { toMysqlDateTime } from '../repositories/userRepository.js';

export default class TokenService {
  signPayload(payload, expiresIn = config.jwtExpiry) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn });
  }

  verifyPayload(token) {
    return jwt.verify(token, config.jwtSecret);
  }

  generateToken(userId, emailOrPhone, role = 'client') {
    return this.signPayload({ userId, subject: emailOrPhone, role }, config.jwtExpiry);
  }

  verifyToken(token) {
    try {
      return { success: true, data: jwt.verify(token, config.jwtSecret) };
    } catch (error) {
      return {
        success: false,
        code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      };
    }
  }

  generateVerificationCode() {
    const min = 10 ** (config.verificationCodeLength - 1);
    const max = (10 ** config.verificationCodeLength) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  getVerificationCodeExpiry(seconds = config.verificationCodeExpirySeconds) {
    const value = new Date(Date.now() + seconds * 1000);
    return toMysqlDateTime(value);
  }

  generateOpaqueToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  generateDeterministicCode(subject, purpose = 'verify', lifetimeSeconds = config.verificationCodeExpirySeconds) {
    const window = Math.floor(Date.now() / (lifetimeSeconds * 1000));
    const digest = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${purpose}:${String(subject).trim().toLowerCase()}:${window}`)
      .digest('hex');
    const raw = (BigInt(`0x${digest.slice(0, 12)}`) % BigInt(10 ** config.verificationCodeLength)).toString();
    return raw.padStart(config.verificationCodeLength, '0');
  }

  matchesDeterministicCode(subject, purpose, code, lifetimeSeconds = config.verificationCodeExpirySeconds) {
    const normalized = String(code || '').trim();
    const buckets = [0, -1];

    return buckets.some((offset) => {
      const window = Math.floor(Date.now() / (lifetimeSeconds * 1000)) + offset;
      const digest = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${purpose}:${String(subject).trim().toLowerCase()}:${window}`)
        .digest('hex');
      const raw = (BigInt(`0x${digest.slice(0, 12)}`) % BigInt(10 ** config.verificationCodeLength)).toString();
      return raw.padStart(config.verificationCodeLength, '0') === normalized;
    });
  }
}
