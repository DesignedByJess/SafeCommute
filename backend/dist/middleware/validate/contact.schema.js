"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.createContactSchema = void 0;
const zod_1 = require("zod");
exports.createContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    phone: zod_1.z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number (+234XXXXXXXXXX)'),
    relationship: zod_1.z.string().max(20).optional(),
});
exports.verifyOtpSchema = zod_1.z.object({
    contactId: zod_1.z.string().uuid(),
    otp: zod_1.z.string().length(6),
});
