"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const audit_service_1 = require("../../services/audit.service");
const config_1 = require("../../utils/config");
class NotificationService {
    async sendTripStarted(payload) {
        const message = `${payload.userName} is on a SafeCommute trip. Track live: https://safecommute.app/track/${payload.shareToken}`;
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
    async sendTripEnded(payload) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
        const message = `${payload.userName} arrived safely at ${payload.destination} around ${timeStr}. — SafeCommute`;
        const results = await Promise.allSettled([
            this.sendWhatsApp(payload.contactPhone, message),
            this.sendAfricaTalking(payload.contactPhone, message),
        ]);
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                audit_service_1.logger.error(`Notification channel ${i} failed for trip end`, { error: r.reason });
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
        if (!config_1.env.WHATSAPP_API_TOKEN || !config_1.env.WHATSAPP_PHONE_NUMBER_ID) {
            throw new Error('WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured');
        }
        const response = await fetch(`https://graph.facebook.com/v18.0/${config_1.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config_1.env.WHATSAPP_API_TOKEN}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: message },
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WhatsApp API error: ${response.status} ${errorText}`);
        }
        audit_service_1.logger.info(`[WhatsApp] Sent to ${phone}`);
    }
    async sendAfricaTalking(phone, message) {
        if (!config_1.env.AFRICA_TALKING_API_KEY) {
            throw new Error('AFRICA_TALKING_API_KEY not configured');
        }
        const response = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'ApiKey': config_1.env.AFRICA_TALKING_API_KEY,
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                username: 'safecommute',
                to: phone,
                message,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Africa's Talking API error: ${response.status} ${errorText}`);
        }
        audit_service_1.logger.info(`[Africa's Talking] Sent to ${phone}`);
    }
    async sendTwilio(phone, message) {
        if (!config_1.env.TWILIO_ACCOUNT_SID || !config_1.env.TWILIO_AUTH_TOKEN || !config_1.env.TWILIO_PHONE_NUMBER) {
            throw new Error('Twilio credentials not configured');
        }
        const auth = Buffer.from(`${config_1.env.TWILIO_ACCOUNT_SID}:${config_1.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config_1.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
            },
            body: new URLSearchParams({
                To: phone,
                From: config_1.env.TWILIO_PHONE_NUMBER,
                Body: message,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Twilio API error: ${response.status} ${errorText}`);
        }
        audit_service_1.logger.info(`[Twilio] Sent to ${phone}`);
    }
}
exports.NotificationService = NotificationService;
