"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trip = void 0;
const sequelize_1 = require("sequelize");
const index_1 = __importDefault(require("./index"));
class Trip extends sequelize_1.Model {
    id;
    user_id;
    share_token;
    share_link_expires_at;
    share_link_revoked;
    origin_lat;
    origin_lng;
    origin_address;
    destination_lat;
    destination_lng;
    destination_address;
    vehicle_plate_encrypted;
    vehicle_plate_data_key_encrypted;
    contact_id;
    contact_name;
    contact_phone_encrypted;
    safety_notes;
    status;
    started_at;
    ended_at;
    expires_at;
    created_at;
    updated_at;
}
exports.Trip = Trip;
Trip.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    share_token: {
        type: sequelize_1.DataTypes.STRING(32),
        allowNull: false,
        unique: true,
    },
    share_link_expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    share_link_revoked: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    origin_lat: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    origin_lng: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    origin_address: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: true,
    },
    destination_lat: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    destination_lng: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    destination_address: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
    },
    vehicle_plate_encrypted: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    vehicle_plate_data_key_encrypted: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    contact_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
    contact_name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    contact_phone_encrypted: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    safety_notes: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['active', 'completed', 'emergency']],
        },
    },
    started_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
    ended_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
}, {
    sequelize: index_1.default,
    tableName: 'trips',
    timestamps: false,
});
exports.default = Trip;
