"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const pending_payment_model_1 = require("../models/pending-payment.model");
const subscription_model_1 = require("../models/subscription.model");
const audit_service_1 = require("./audit.service");
const errors_1 = require("../utils/errors");
const PLAN_CONFIG = {
    premium_monthly: { amount: 833, durationMonths: 1 },
    premium_yearly: { amount: 10000, durationMonths: 12 },
    family_yearly: { amount: 15000, durationMonths: 12 },
};
class PaymentService {
    async initializePayment(userId, userEmail, plan) {
        const config = PLAN_CONFIG[plan];
        if (!config)
            throw new errors_1.AppError('Invalid plan selected', 400, 'INVALID_PLAN');
        const txRef = `SC-${userId.slice(0, 8)}-${crypto_1.default.randomBytes(4).toString('hex')}`;
        await pending_payment_model_1.PendingPayment.create({
            tx_ref: txRef,
            user_id: userId,
            plan,
            amount: config.amount,
            currency: 'NGN',
            status: 'pending',
        });
        await (0, audit_service_1.auditLog)(userId, 'payment_initiated', { txRef, plan, amount: config.amount });
        return {
            tx_ref: txRef,
            amount: config.amount,
            currency: 'NGN',
            plan,
            public_key: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
        };
    }
    async verifyPayment(transactionId, txRef) {
        const pending = await pending_payment_model_1.PendingPayment.findOne({ where: { tx_ref: txRef } });
        if (!pending)
            throw new errors_1.AppError('Transaction not found', 404, 'NOT_FOUND');
        if (pending.status !== 'pending') {
            throw new errors_1.AppError('Transaction already processed', 400, 'ALREADY_PROCESSED');
        }
        const startsAt = new Date();
        const config = PLAN_CONFIG[pending.plan];
        const expiresAt = new Date(startsAt.getTime() + config.durationMonths * 30 * 24 * 60 * 60 * 1000);
        await subscription_model_1.Subscription.upsert({
            user_id: pending.user_id,
            plan: pending.plan,
            status: 'active',
            starts_at: startsAt,
            expires_at: expiresAt,
            tx_ref: txRef,
        });
        pending.status = 'completed';
        await pending.save();
        await (0, audit_service_1.auditLog)(pending.user_id, 'payment_completed', { transaction_id: transactionId, tx_ref: txRef });
        return { verified: true };
    }
    async handleWebhook(payload) {
        if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
            const { tx_ref, amount, currency } = payload.data;
            const pending = await pending_payment_model_1.PendingPayment.findOne({ where: { tx_ref } });
            if (!pending)
                return;
            if (pending.amount !== amount || currency !== 'NGN') {
                await (0, audit_service_1.auditLog)(null, 'payment_amount_mismatch', { tx_ref, amount });
                return;
            }
            const startsAt = new Date();
            const config = PLAN_CONFIG[pending.plan];
            const expiresAt = new Date(startsAt.getTime() + config.durationMonths * 30 * 24 * 60 * 60 * 1000);
            await subscription_model_1.Subscription.upsert({
                user_id: pending.user_id,
                plan: pending.plan,
                status: 'active',
                starts_at: startsAt,
                expires_at: expiresAt,
                tx_ref,
            });
            pending.status = 'completed';
            await pending.save();
            await (0, audit_service_1.auditLog)(pending.user_id, 'payment_webhook_confirmed', { tx_ref });
        }
    }
}
exports.PaymentService = PaymentService;
