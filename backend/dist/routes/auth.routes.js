"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const auth_schema_1 = require("../middleware/validate/auth.schema");
const auth_schema_2 = require("../middleware/validate/auth.schema");
const rate_limit_1 = require("../middleware/rate-limit");
const response_1 = require("../utils/response");
const config_1 = require("../utils/config");
const audit_service_1 = require("../services/audit.service");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.post('/signup', rate_limit_1.signupLimiter, (0, validate_1.validate)(auth_schema_1.signupSchema), async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        let response;
        try {
            response = await fetch(`${config_1.env.SUPABASE_URL}/auth/v1/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config_1.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${config_1.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { name },
                }),
            });
        }
        catch (fetchErr) {
            audit_service_1.logger.error('Supabase unreachable during signup', { error: fetchErr, supabaseUrl: config_1.env.SUPABASE_URL });
            return next(new errors_1.AppError('Authentication service is unavailable. Please ensure Supabase is running and try again.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
        }
        const data = (await response.json());
        if (!response.ok) {
            return next(new errors_1.AppError(data.msg || data.error_description || 'Signup failed', 400, 'SIGNUP_FAILED'));
        }
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await (0, audit_service_1.auditLog)(data.id, 'signup', { email, name }, ipAddress, userAgent);
        let loginResponse;
        try {
            loginResponse = await fetch(`${config_1.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config_1.env.SUPABASE_SERVICE_ROLE_KEY,
                },
                body: JSON.stringify({ email, password }),
            });
        }
        catch (fetchErr) {
            audit_service_1.logger.error('Supabase unreachable during auto-login after signup', { error: fetchErr });
            return next(new errors_1.AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
        }
        const loginData = (await loginResponse.json());
        if (!loginResponse.ok) {
            return next(new errors_1.AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
        }
        res.cookie('sb-access-token', loginData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 * 1000,
        });
        res.cookie('sb-refresh-token', loginData.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 30 * 1000,
        });
        const user = { id: loginData.user.id, email: loginData.user.email, name };
        (0, response_1.sendCreated)(res, { user });
    }
    catch (err) {
        next(err);
    }
});
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new errors_1.AppError('Email is required', 400, 'VALIDATION_ERROR'));
        }
        let response;
        try {
            response = await fetch(`${config_1.env.SUPABASE_URL}/auth/v1/recover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config_1.env.SUPABASE_SERVICE_ROLE_KEY,
                },
                body: JSON.stringify({ email }),
            });
        }
        catch (fetchErr) {
            audit_service_1.logger.error('Supabase unreachable during password reset', { error: fetchErr });
            return next(new errors_1.AppError('Authentication service is unavailable. Please try again later.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
        }
        if (!response.ok) {
            const data = await response.json();
            return next(new errors_1.AppError(data.msg || 'Failed to send reset email', 400, 'RESET_FAILED'));
        }
        (0, response_1.sendSuccess)(res, { message: 'Reset link sent' });
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', rate_limit_1.loginLimiter, (0, validate_1.validate)(auth_schema_2.loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        let response;
        try {
            response = await fetch(`${config_1.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config_1.env.SUPABASE_SERVICE_ROLE_KEY,
                },
                body: JSON.stringify({ email, password }),
            });
        }
        catch (fetchErr) {
            audit_service_1.logger.error('Supabase unreachable during login', { error: fetchErr, supabaseUrl: config_1.env.SUPABASE_URL });
            return next(new errors_1.AppError('Authentication service is unavailable. Please ensure Supabase is running and try again.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
        }
        const data = (await response.json());
        if (!response.ok) {
            return next(new errors_1.AppError(data.msg || 'Invalid credentials', 401, 'LOGIN_FAILED'));
        }
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await (0, audit_service_1.auditLog)(data.user.id, 'login', { email }, ipAddress, userAgent);
        res.cookie('sb-access-token', data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 * 1000,
        });
        res.cookie('sb-refresh-token', data.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 30 * 1000,
        });
        (0, response_1.sendSuccess)(res, { user: { id: data.user.id, email: data.user.email } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/me', authenticate_1.authenticate, (req, res) => {
    (0, response_1.sendSuccess)(res, { user: req.user });
});
exports.default = router;
