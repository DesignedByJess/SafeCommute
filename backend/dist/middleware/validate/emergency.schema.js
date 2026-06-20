"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retractEmergencySchema = exports.triggerEmergencySchema = void 0;
const zod_1 = require("zod");
exports.triggerEmergencySchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    accuracy: zod_1.z.number().min(0).max(10000).optional(),
});
exports.retractEmergencySchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
