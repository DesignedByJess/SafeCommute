"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.auditLog = auditLog;
const winston_1 = __importDefault(require("winston"));
const audit_model_1 = require("../models/audit.model");
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
exports.logger = logger;
/**
 * Record an audit event in the database and write to system logs.
 */
async function auditLog(userId, eventType, eventData = {}, ipAddress, userAgent) {
    try {
        // 1. Write to database audit log table
        await audit_model_1.AuditLog.create({
            user_id: userId,
            event_type: eventType,
            event_data: eventData,
            ip_address: ipAddress || null,
            user_agent: userAgent || null
        });
        // 2. Log using Winston
        logger.info({
            message: `Audit Event: ${eventType}`,
            userId,
            eventData,
            ipAddress,
            userAgent
        });
    }
    catch (err) {
        // Fallback: log to console if DB fails
        logger.error('Failed to write audit log to database', {
            error: err,
            userId,
            eventType,
            eventData
        });
    }
}
