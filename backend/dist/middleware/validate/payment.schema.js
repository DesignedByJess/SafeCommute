"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentSchema = exports.initiatePaymentSchema = void 0;
const zod_1 = require("zod");
exports.initiatePaymentSchema = zod_1.z.object({
    plan: zod_1.z.enum(['premium_monthly', 'premium_yearly', 'family_yearly']),
    currency: zod_1.z.enum(['NGN']).default('NGN'),
});
exports.verifyPaymentSchema = zod_1.z.object({
    transaction_id: zod_1.z.string().min(1),
    tx_ref: zod_1.z.string().min(1),
});
