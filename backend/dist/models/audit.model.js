"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const sequelize_1 = require("sequelize");
const index_1 = __importDefault(require("./index"));
class AuditLog extends sequelize_1.Model {
    id;
    user_id;
    event_type;
    event_data;
    ip_address;
    user_agent;
    created_at;
}
exports.AuditLog = AuditLog;
AuditLog.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
    event_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    event_data: {
        type: sequelize_1.DataTypes.JSONB,
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
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
}, {
    sequelize: index_1.default,
    tableName: 'audit_logs',
    timestamps: false,
});
exports.default = AuditLog;
