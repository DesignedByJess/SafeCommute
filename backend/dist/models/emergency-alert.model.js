"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyAlert = void 0;
const sequelize_1 = require("sequelize");
const index_1 = __importDefault(require("./index"));
class EmergencyAlert extends sequelize_1.Model {
    id;
    trip_id;
    lat;
    lng;
    accuracy;
    ip_address;
    user_agent;
    triggered_at;
    retracted_at;
    retraction_reason;
    verified;
}
exports.EmergencyAlert = EmergencyAlert;
EmergencyAlert.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    trip_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    lat: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    lng: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    accuracy: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: true,
    },
    ip_address: {
        type: sequelize_1.DataTypes.INET,
        allowNull: true,
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    triggered_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
    retracted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    retraction_reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    verified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
}, {
    sequelize: index_1.default,
    tableName: 'emergency_alerts',
    timestamps: false,
});
exports.default = EmergencyAlert;
