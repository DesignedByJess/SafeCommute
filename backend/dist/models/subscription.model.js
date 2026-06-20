"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../database/sequelize"));
class Subscription extends sequelize_1.Model {
    id;
    user_id;
    plan;
    status;
    starts_at;
    expires_at;
    tx_ref;
    created_at;
    updated_at;
}
exports.Subscription = Subscription;
Subscription.init({
    id: { type: sequelize_1.DataTypes.UUID, primaryKey: true, defaultValue: sequelize_1.DataTypes.UUIDV4 },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, unique: true },
    plan: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    status: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    starts_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    expires_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    tx_ref: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
    created_at: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW, allowNull: false },
}, { sequelize: sequelize_2.default, tableName: 'subscriptions', timestamps: false });
exports.default = Subscription;
