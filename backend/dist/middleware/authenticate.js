"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const errors_1 = require("../utils/errors");
function authenticate(req, _res, next) {
    const accessToken = req.cookies?.['sb-access-token'];
    const authHeader = req.headers.authorization;
    let token;
    if (accessToken) {
        token = accessToken;
    }
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        return next(new errors_1.UnauthorizedError('Authentication required'));
    }
    try {
        const base64Payload = token.split('.')[1];
        if (!base64Payload)
            throw new errors_1.UnauthorizedError('Invalid token format');
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return next(new errors_1.UnauthorizedError('Token has expired'));
        }
        req.user = {
            id: payload.sub,
            email: payload.email,
            phone: payload.phone,
        };
        next();
    }
    catch (err) {
        if (err instanceof errors_1.UnauthorizedError)
            return next(err);
        return next(new errors_1.UnauthorizedError('Invalid token'));
    }
}
