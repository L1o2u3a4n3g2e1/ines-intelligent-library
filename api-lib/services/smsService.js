import config from '../config.js';
import { nowMysql } from '../repositories/userRepository.js';

const formatNow = () => nowMysql();

export default class SmsService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  getMessagingEndpoint(mode) {
    if (mode === 'sandbox') {
      return 'https://api.sandbox.africastalking.com/version1/messaging';
    }

    return 'https://api.africastalking.com/version1/messaging';
  }

  resolveMode() {
    if (config.sms.mode) {
      return config.sms.mode;
    }

    if (!config.sms.provider || config.sms.provider === 'simulated') {
      return 'simulated';
    }

    if (config.sms.provider === 'africastalking') {
      if (config.sms.username && config.sms.apiKey) {
        return config.isProduction ? 'live' : 'sandbox';
      }
      return 'unconfigured';
    }

    return 'unconfigured';
  }

  async sendGuestVerificationCode(userId, phone, code) {
    const mode = this.resolveMode();
    const message = `Your ${config.appName} guest verification code is ${code}.`;

    if (mode === 'live') {
      const payload = new URLSearchParams({
        username: config.sms.username,
        to: phone,
        message,
      });

      if (config.sms.senderId) {
        payload.set('from', config.sms.senderId);
      }

      try {
        const response = await fetch(this.getMessagingEndpoint(mode), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            apiKey: config.sms.apiKey,
          },
          body: payload.toString(),
        });

        const rawText = await response.text();
        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }

        const recipients = parsed?.SMSMessageData?.Recipients || [];
        const successfulRecipient = recipients.find((recipient) => {
          const status = String(recipient?.status || '').toLowerCase();
          return status === 'success' || Number(recipient?.statusCode) === 101;
        });

        const smsAccepted = response.ok && Boolean(successfulRecipient);
        await this.userRepository.persistSmsLog({
          userId,
          recipientPhone: phone,
          message,
          status: smsAccepted ? 'sent' : 'failed',
          errorMessage: smsAccepted ? null : rawText.slice(0, 1000),
          sentAt: smsAccepted ? formatNow() : null,
        });

        return {
          success: smsAccepted,
          delivery: 'live',
          message: smsAccepted ? 'SMS sent successfully' : 'Africa\'s Talking rejected the SMS request',
          error: smsAccepted ? null : parsed?.SMSMessageData?.Message || rawText || 'SMS_SEND_FAILED',
        };
      } catch (error) {
        await this.userRepository.persistSmsLog({
          userId,
          recipientPhone: phone,
          message,
          status: 'failed',
          errorMessage: error.message,
        });

        return {
          success: false,
          delivery: 'live',
          message: 'Failed to send SMS',
          error: error.message,
        };
      }
    }

    if (mode === 'sandbox') {
      await this.userRepository.persistSmsLog({
        userId,
        recipientPhone: phone,
        message,
        status: 'sent',
        errorMessage: 'Sandbox mode - simulator only',
        sentAt: formatNow(),
      });

      return {
        success: true,
        delivery: 'sandbox',
        message: 'SMS sent to sandbox simulator',
        error: null,
      };
    }

    await this.userRepository.persistSmsLog({
      userId,
      recipientPhone: phone,
      message,
      status: 'failed',
      errorMessage: 'Simulated delivery only',
      sentAt: formatNow(),
    });

    return {
      success: false,
      delivery: mode,
      message: 'Real SMS delivery is not configured',
      error: 'SMS_UNAVAILABLE',
    };
  }
}
