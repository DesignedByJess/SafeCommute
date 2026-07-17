"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const errors_1 = require("../utils/errors");
const jwt_1 = require("../utils/jwt");
async function authenticate(req, _res, next) {
    try {
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
        const payload = await (0, jwt_1.verifyJwt)(token);
        if (!payload) {
            return next(new errors_1.UnauthorizedError('Invalid or expired token'));
        }
        req.user = {
            id: payload.sub,
            email: payload.email,
            phone: payload.phone,
            name: payload.user_metadata?.name || undefined,
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
