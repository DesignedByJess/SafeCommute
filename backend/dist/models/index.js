"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = exports.PendingPayment = exports.AuditLog = exports.EncryptionKey = exports.EmergencyAlert = exports.TripLocation = exports.Trip = exports.Contact = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
require('dotenv').config();
const env = process.env.NODE_ENV || 'development';
const config = require('../database/config.js')[env];
exports.sequelize = config.use_env_variable
    ? new sequelize_1.Sequelize(process.env[config.use_env_variable], config)
    : new sequelize_1.Sequelize(config.database, config.username, config.password, config);
const contact_model_1 = __importDefault(require("./contact.model"));
exports.Contact = contact_model_1.default;
const trip_model_1 = __importDefault(require("./trip.model"));
exports.Trip = trip_model_1.default;
const trip_location_model_1 = __importDefault(require("./trip-location.model"));
exports.TripLocation = trip_location_model_1.default;
const emergency_alert_model_1 = __importDefault(require("./emergency-alert.model"));
exports.EmergencyAlert = emergency_alert_model_1.default;
const encryption_key_model_1 = __importDefault(require("./encryption-key.model"));
exports.EncryptionKey = encryption_key_model_1.default;
const audit_model_1 = __importDefault(require("./audit.model"));
exports.AuditLog = audit_model_1.default;
const pending_payment_model_1 = __importDefault(require("./pending-payment.model"));
exports.PendingPayment = pending_payment_model_1.default;
const subscription_model_1 = __importDefault(require("./subscription.model"));
exports.Subscription = subscription_model_1.default;
contact_model_1.default.hasMany(trip_model_1.default, { foreignKey: 'contact_id', as: 'trips' });
trip_model_1.default.belongsTo(contact_model_1.default, { foreignKey: 'contact_id', as: 'contact' });
trip_model_1.default.hasMany(trip_location_model_1.default, { foreignKey: 'trip_id', as: 'locations' });
trip_location_model_1.default.belongsTo(trip_model_1.default, { foreignKey: 'trip_id', as: 'trip' });
trip_model_1.default.hasMany(emergency_alert_model_1.default, { foreignKey: 'trip_id', as: 'emergencyAlerts' });
emergency_alert_model_1.default.belongsTo(trip_model_1.default, { foreignKey: 'trip_id', as: 'trip' });
exports.default = exports.sequelize;
