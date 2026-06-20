"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const audit_service_1 = require("../audit.service");
class NotificationService {
    async sendTripStarted(payload) {
        const message = `${payload.contactName} is on a SafeCommute trip. Track live: https://safecommute.app/track/${payload.shareToken}`;
        const results = await Promise.allSettled([
            this.sendWhatsApp(payload.contactPhone, message),
            this.sendAfricaTalking(payload.contactPhone, message),
        ]);
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                audit_service_1.logger.error(`Notification channel ${i} failed for trip start`, { error: r.reason });
            }
        });
    }
    async sendEmergencyAlert(payload) {
        const message = `EMERGENCY: ${payload.contactName} triggered an emergency alert on SafeCommute. Location: https://maps.google.com/?q=${payload.lat},${payload.lng}. Track: https://safecommute.app/track/${payload.shareToken}`;
        await Promise.allSettled([
            this.sendWhatsApp(payload.contactPhone, message),
            this.sendAfricaTalking(payload.contactPhone, message),
            this.sendTwilio(payload.contactPhone, message),
        ]);
    }
    async sendWhatsApp(phone, message) {
        audit_service_1.logger.info(`[WhatsApp] To: ${phone} — ${message.substring(0, 50)}...`);
        if (!process.env.WHATSAPP_API_TOKEN) {
            throw new Error('WHATSAPP_API_TOKEN not configured');
        }
    }
    async sendAfricaTalking(phone, message) {
        audit_service_1.logger.info(`[Africa's Talking] To: ${phone} — ${message.substring(0, 50)}...`);
        if (!process.env.AFRICA_TALKING_API_KEY) {
            throw new Error('AFRICA_TALKING_API_KEY not configured');
        }
    }
    async sendTwilio(phone, message) {
        audit_service_1.logger.info(`[Twilio] To: ${phone} — ${message.substring(0, 50)}...`);
        if (!process.env.TWILIO_ACCOUNT_SID) {
            throw new Error('TWILIO_ACCOUNT_SID not configured');
        }
    }
}
exports.NotificationService = NotificationService;
