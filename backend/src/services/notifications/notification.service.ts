import { logger } from '../audit.service';

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
    const message = `${payload.contactName} is on a SafeCommute trip. Track live: https://safecommute.app/track/${payload.shareToken}`;

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

  async sendEmergencyAlert(payload: EmergencyPayload): Promise<void> {
    const message = `EMERGENCY: ${payload.contactName} triggered an emergency alert on SafeCommute. Location: https://maps.google.com/?q=${payload.lat},${payload.lng}. Track: https://safecommute.app/track/${payload.shareToken}`;

    await Promise.allSettled([
      this.sendWhatsApp(payload.contactPhone, message),
      this.sendAfricaTalking(payload.contactPhone, message),
      this.sendTwilio(payload.contactPhone, message),
    ]);
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    logger.info(`[WhatsApp] To: ${phone} — ${message.substring(0, 50)}...`);
    if (!process.env.WHATSAPP_API_TOKEN) {
      throw new Error('WHATSAPP_API_TOKEN not configured');
    }
  }

  private async sendAfricaTalking(phone: string, message: string): Promise<void> {
    logger.info(`[Africa's Talking] To: ${phone} — ${message.substring(0, 50)}...`);
    if (!process.env.AFRICA_TALKING_API_KEY) {
      throw new Error('AFRICA_TALKING_API_KEY not configured');
    }
  }

  private async sendTwilio(phone: string, message: string): Promise<void> {
    logger.info(`[Twilio] To: ${phone} — ${message.substring(0, 50)}...`);
    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error('TWILIO_ACCOUNT_SID not configured');
    }
  }
}
