import crypto from 'crypto';
import { PendingPayment } from '../models/pending-payment.model';
import { Subscription } from '../models/subscription.model';
import { auditLog } from './audit.service';
import { AppError } from '../utils/errors';

const PLAN_CONFIG: Record<string, { amount: number; durationMonths: number }> = {
  premium_monthly: { amount: 833, durationMonths: 1 },
  premium_yearly: { amount: 10000, durationMonths: 12 },
  family_yearly: { amount: 15000, durationMonths: 12 },
};

export class PaymentService {
  async initializePayment(userId: string, userEmail: string, plan: string) {
    const config = PLAN_CONFIG[plan];
    if (!config) throw new AppError('Invalid plan selected', 400, 'INVALID_PLAN');

    const txRef = `SC-${userId.slice(0, 8)}-${crypto.randomBytes(4).toString('hex')}`;

    await PendingPayment.create({
      tx_ref: txRef,
      user_id: userId,
      plan,
      amount: config.amount,
      currency: 'NGN',
      status: 'pending',
    });

    await auditLog(userId, 'payment_initiated', { txRef, plan, amount: config.amount });

    return {
      tx_ref: txRef,
      amount: config.amount,
      currency: 'NGN',
      plan,
      public_key: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
    };
  }

  async verifyPayment(transactionId: string, txRef: string) {
    const pending = await PendingPayment.findOne({ where: { tx_ref: txRef } });
    if (!pending) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    if (pending.status !== 'pending') {
      throw new AppError('Transaction already processed', 400, 'ALREADY_PROCESSED');
    }

    const startsAt = new Date();
    const config = PLAN_CONFIG[pending.plan];
    const expiresAt = new Date(startsAt.getTime() + config.durationMonths * 30 * 24 * 60 * 60 * 1000);

    await Subscription.upsert({
      user_id: pending.user_id,
      plan: pending.plan,
      status: 'active',
      starts_at: startsAt,
      expires_at: expiresAt,
      tx_ref: txRef,
    });

    pending.status = 'completed';
    await pending.save();

    await auditLog(pending.user_id, 'payment_completed', { transaction_id: transactionId, tx_ref: txRef });

    return { verified: true };
  }

  async handleWebhook(payload: any): Promise<void> {
    if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
      const { tx_ref, amount, currency } = payload.data;

      const pending = await PendingPayment.findOne({ where: { tx_ref } });
      if (!pending) return;

      if (pending.amount !== amount || currency !== 'NGN') {
        await auditLog(null, 'payment_amount_mismatch', { tx_ref, amount });
        return;
      }

      const startsAt = new Date();
      const config = PLAN_CONFIG[pending.plan];
      const expiresAt = new Date(startsAt.getTime() + config.durationMonths * 30 * 24 * 60 * 60 * 1000);

      await Subscription.upsert({
        user_id: pending.user_id,
        plan: pending.plan,
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt,
        tx_ref,
      });

      pending.status = 'completed';
      await pending.save();

      await auditLog(pending.user_id, 'payment_webhook_confirmed', { tx_ref });
    }
  }
}
