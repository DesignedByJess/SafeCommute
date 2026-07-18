"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function getEnv(name, defaultValue) {
    return process.env[name] || defaultValue;
}
exports.env = {
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    PORT: parseInt(getEnv('PORT', '3000'), 10),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    DATABASE_URL_TEST: getEnv('DATABASE_URL_TEST', ''),
    CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
    CSRF_SECRET: requireEnv('CSRF_SECRET'),
    HMAC_SECRET: requireEnv('HMAC_SECRET'),
    MASTER_KEY: requireEnv('MASTER_KEY'),
    PHONE_KEY: requireEnv('PHONE_KEY'),
    SUPABASE_URL: requireEnv('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_JWT_SECRET: requireEnv('SUPABASE_JWT_SECRET'),
    FLUTTERWAVE_PUBLIC_KEY: requireEnv('FLUTTERWAVE_PUBLIC_KEY'),
    FLUTTERWAVE_SECRET_KEY: requireEnv('FLUTTERWAVE_SECRET_KEY'),
    FLUTTERWAVE_ENCRYPTION_KEY: requireEnv('FLUTTERWAVE_ENCRYPTION_KEY'),
    FLUTTERWAVE_SECRET_HASH: requireEnv('FLUTTERWAVE_SECRET_HASH'),
    WHATSAPP_API_TOKEN: requireEnv('WHATSAPP_API_TOKEN'),
    WHATSAPP_PHONE_NUMBER_ID: getEnv('WHATSAPP_PHONE_NUMBER_ID', ''),
    AFRICA_TALKING_API_KEY: requireEnv('AFRICA_TALKING_API_KEY'),
    AFRICA_TALKING_USERNAME: requireEnv('AFRICA_TALKING_USERNAME'),
    AFRICA_TALKING_SENDER_ID: getEnv('AFRICA_TALKING_SENDER_ID', 'SafeCommute'),
    AFRICA_TALKING_SANDBOX: getEnv('AFRICA_TALKING_SANDBOX', 'false') === 'true',
    TWILIO_ACCOUNT_SID: requireEnv('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: requireEnv('TWILIO_AUTH_TOKEN'),
    TWILIO_PHONE_NUMBER: getEnv('TWILIO_PHONE_NUMBER', ''),
    GOOGLE_MAPS_API_KEY: requireEnv('GOOGLE_MAPS_API_KEY'),
    GOOGLE_VISION_API_KEY: requireEnv('GOOGLE_VISION_API_KEY'),
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
};
