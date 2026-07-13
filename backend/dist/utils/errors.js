"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.RateLimitError = exports.ShareLinkExpiredError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ShareLinkExpiredError extends AppError {
    constructor() {
        super('Share link has expired', 410, 'SHARE_LINK_EXPIRED');
    }
}
exports.ShareLinkExpiredError = ShareLinkExpiredError;
class RateLimitError extends AppError {
    constructor() {
        super('Too many requests, please try again later', 429, 'RATE_LIMITED');
    }
}
exports.RateLimitError = RateLimitError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
