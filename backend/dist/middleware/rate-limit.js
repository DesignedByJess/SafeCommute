"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordLimiter = exports.signupLimiter = exports.emergencyLimiter = exports.shareLinkLimiter = exports.tripCreationLimiter = exports.otpLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const defaults = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
};
exports.loginLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many login attempts, try again later', code: 'RATE_LIMITED' },
});
exports.otpLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Too many OTP requests, try again later', code: 'RATE_LIMITED' },
});
exports.tripCreationLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many trips created, try again later', code: 'RATE_LIMITED' },
});
exports.shareLinkLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many share link views, try again later', code: 'RATE_LIMITED' },
});
exports.emergencyLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Emergency alert limit reached (3 per 24 hours)', code: 'RATE_LIMITED' },
});
exports.signupLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many signup attempts, try again later', code: 'RATE_LIMITED' },
});
exports.forgotPasswordLimiter = (0, express_rate_limit_1.default)({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Too many reset requests, try again later', code: 'RATE_LIMITED' },
});
