"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
const audit_service_1 = require("../services/audit.service");
function errorHandler(err, req, res, _next) {
    if (err instanceof errors_1.AppError) {
        (0, response_1.sendError)(res, err.message, err.statusCode, err.code);
        return;
    }
    if (err.name === 'CSRF token mismatch' || err.code === 'EBADCSRFTOKEN') {
        (0, response_1.sendError)(res, 'Invalid CSRF token', 403, 'CSRF_ERROR');
        return;
    }
    audit_service_1.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });
    (0, response_1.sendError)(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}
