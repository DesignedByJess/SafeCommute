"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayload = signPayload;
exports.verifySignature = verifySignature;
const crypto_1 = require("crypto");
const config_1 = require("../utils/config");
function signPayload(payload) {
    return (0, crypto_1.createHmac)('sha256', config_1.env.HMAC_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
}
function verifySignature(payload, signature) {
    const expected = signPayload(payload);
    if (expected.length !== signature.length)
        return false;
    return cryptoTimingSafeEqual(expected, signature);
}
function cryptoTimingSafeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
