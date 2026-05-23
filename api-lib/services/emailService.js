import nodemailer from 'nodemailer';
import config from '../config.js';
import { nowMysql } from '../repositories/userRepository.js';

const formatNow = () => nowMysql();

export default class EmailService {
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.transport = null;

    if (config.mail.host && config.mail.user && config.mail.pass) {
      this.transport = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: {
          user: config.mail.user,
          pass: config.mail.pass,
        },
      });
    }
  }

  async sendMail({ userId = null, to, subject, html, text }) {
    if (!this.transport) {
      await this.userRepository.persistEmailLog({
        userId,
        recipientEmail: to,
        subject,
        body: html,
        status: 'failed',
        errorMessage: 'Mail transport not configured',
      });

      return {
        success: false,
        message: 'Email transport not configured',
        error: 'MAIL_NOT_CONFIGURED',
      };
    }

    try {
      await this.transport.sendMail({
        from: `${config.mail.fromName} <${config.mail.from}>`,
        to,
        subject,
        html,
        text,
      });

      await this.userRepository.persistEmailLog({
        userId,
        recipientEmail: to,
        subject,
        body: html,
        status: 'sent',
        sentAt: formatNow(),
      });

      return { success: true, message: 'Email sent' };
    } catch (error) {
      await this.userRepository.persistEmailLog({
        userId,
        recipientEmail: to,
        subject,
        body: html,
        status: 'failed',
        errorMessage: error.message,
      });

      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }

  async sendVerificationEmail(userId, email, userName, code) {
    const subject = `${config.appName} - Verify Your Email`;
    const html = `<h2>${config.appName}</h2><p>Hi ${userName},</p><p>Use this verification code to finish registration:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes.</p>`;
    return this.sendMail({
      userId,
      to: email,
      subject,
      html,
      text: `Your verification code is ${code}. It expires in 15 minutes.`,
    });
  }

  async sendWelcomeEmail(userId, email, userName) {
    const subject = `Welcome to ${config.appName}`;
    const html = `<h2>Welcome to ${config.appName}</h2><p>Hi ${userName}, your account is now verified and ready to use.</p>`;
    return this.sendMail({ userId, to: email, subject, html, text: `Welcome to ${config.appName}.` });
  }

  async sendPasswordResetEmail(userId, email, userName, resetCode) {
    const resetLink = `${config.frontendUrl.replace(/\/+$/, '')}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(resetCode)}`;
    const subject = `${config.appName} - Reset Your Password`;
    const html = `<h2>${config.appName}</h2><p>Hi ${userName},</p><p>We received a request to reset your password.</p><p><a href="${resetLink}">Reset password</a></p><p>If the button does not work, open this link:</p><p>${resetLink}</p><p>This link expires in 1 hour.</p>`;
    return this.sendMail({
      userId,
      to: email,
      subject,
      html,
      text: `Use this link to reset your password: ${resetLink}`,
    });
  }
}
