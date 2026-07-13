"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retractEmergencySchema = exports.verifyEmergencySchema = exports.initiateEmergencySchema = void 0;
const zod_1 = require("zod");
exports.initiateEmergencySchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    accuracy: zod_1.z.number().min(0).max(10000).optional(),
    userName: zod_1.z.string().min(1).max(100),
});
exports.verifyEmergencySchema = zod_1.z.object({
    code: zod_1.z.string().length(6),
});
exports.retractEmergencySchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
