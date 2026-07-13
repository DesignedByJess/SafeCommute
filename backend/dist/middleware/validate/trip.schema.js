"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endTripSchema = exports.createTripSchema = void 0;
const zod_1 = require("zod");
exports.createTripSchema = zod_1.z.object({
    origin_lat: zod_1.z.number().min(-90).max(90),
    origin_lng: zod_1.z.number().min(-180).max(180),
    origin_address: zod_1.z.string().max(200).optional(),
    destination_lat: zod_1.z.number().min(-90).max(90),
    destination_lng: zod_1.z.number().min(-180).max(180),
    destination_address: zod_1.z.string().min(1).max(200),
    vehicle_plate: zod_1.z.string().min(3).max(20),
    contact_id: zod_1.z.string().uuid().optional(),
    contact_name: zod_1.z.string().min(1).max(50),
    contact_phone: zod_1.z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number').optional(),
    safety_notes: zod_1.z.array(zod_1.z.string().max(500)).optional(),
});
exports.endTripSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    userName: zod_1.z.string().min(1).max(100),
    destination: zod_1.z.string().min(1).max(200),
});
