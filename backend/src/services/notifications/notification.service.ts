import { logger } from '../../services/audit.service';
import { env } from '../../utils/config';

interface TripStartedPayload {
  contactName: string;
  contactPhone: string;
  shareToken: string;
  userName: string;
}

interface EmergencyPayload {
  contactName: string;
  contactPhone: string;
  shareToken: string;
  lat: number;
  lng: number;
}

export class NotificationService {
  async sendTripStarted(payload: TripStartedPayload): Promise<void> {
    const message = `${payload.userName} is on a SafeCommute trip. Track live: ${env.FRONTEND_URL}/track/${payload.shareToken}`;

    const results = await Promise.allSettled([
      this.sendWhatsApp(payload.contactPhone, message),
      this.sendAfricaTalking(payload.contactPhone, message),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error(`Notification channel ${i} failed for trip start`, { error: r.reason });
      }
    });
  }

  async sendTripEnded(payload: {
    contactName: string;
    contactPhone: string;
    userName: string;
    destination: string;
  }): Promise<void> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const message = `${payload.userName} arrived safely at ${payload.destination} around ${timeStr}. — SafeCommute`;

    const results = await Promise.allSettled([
      this.sendWhatsApp(payload.contactPhone, message),
      this.sendAfricaTalking(payload.contactPhone, message),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error(`Notification channel ${i} failed for trip end`, { error: r.reason });
      }
    });
  }

  async sendEmergencyAlert(payload: EmergencyPayload): Promise<void> {
    const message = `EMERGENCY: ${payload.contactName} triggered an emergency alert on SafeCommute. Location: https://maps.google.com/?q=${payload.lat},${payload.lng}. Track: ${env.FRONTEND_URL}/track/${payload.shareToken}`;

    await Promise.allSettled([
      this.sendWhatsApp(payload.contactPhone, message),
      this.sendAfricaTalking(payload.contactPhone, message),
      this.sendTwilio(payload.contactPhone, message),
    ]);
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${errorText}`);
    }

    logger.info(`[WhatsApp] Sent to ${phone}`);
  }

  async sendAfricaTalking(phone: string, message: string): Promise<void> {
    if (!env.AFRICA_TALKING_API_KEY) {
      throw new Error('AFRICA_TALKING_API_KEY not configured');
    }

    const baseUrl = env.AFRICA_TALKING_SANDBOX
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com';

    const params: Record<string, string> = {
      username: env.AFRICA_TALKING_USERNAME,
      to: phone,
      message,
    };

    const response = await fetch(
      `${baseUrl}/version1/messaging`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'ApiKey': env.AFRICA_TALKING_API_KEY,
          'Accept': 'application/json',
        },
        body: new URLSearchParams(params),
      },
    );

    const body = (await response.json()) as {
      SMSMessageData?: {
        Message?: string;
        Recipients?: Array<{ number?: string; cost?: string; status?: string; statusCode?: string }>;
      };
    };

    if (!response.ok) {
      throw new Error(`Africa's Talking API error: ${response.status} ${JSON.stringify(body)}`);
    }

    logger.info('[Africa\'s Talking] API response', { body });

    const statusCode = body?.SMSMessageData?.Recipients?.[0]?.statusCode;
    if (statusCode && statusCode !== '101') {
      throw new Error(`Africa's Talking delivery failed: code ${statusCode} - ${body?.SMSMessageData?.Recipients?.[0]?.status ?? 'unknown'}`);
    }

    if (!statusCode) {
      logger.warn('[Africa\'s Talking] No status code in response', { body });
    }

    logger.info(`[Africa's Talking] Sent to ${phone}`, { statusCode });
  }

  private async sendTwilio(phone: string, message: string): Promise<void> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: env.TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${errorText}`);
    }

    logger.info(`[Twilio] Sent to ${phone}`);
  }
}
