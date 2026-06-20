"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingPayment = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../database/sequelize"));
class PendingPayment extends sequelize_1.Model {
    id;
    tx_ref;
    user_id;
    plan;
    amount;
    currency;
    status;
    created_at;
}
exports.PendingPayment = PendingPayment;
PendingPayment.init({
    id: { type: sequelize_1.DataTypes.UUID, primaryKey: true, defaultValue: sequelize_1.DataTypes.UUIDV4 },
    tx_ref: { type: sequelize_1.DataTypes.STRING(64), allowNull: false, unique: true },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    plan: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    amount: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    currency: { type: sequelize_1.DataTypes.STRING(3), defaultValue: 'NGN', allowNull: false },
    status: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'pending', allowNull: false },
    created_at: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW, allowNull: false },
}, { sequelize: sequelize_2.default, tableName: 'pending_payments', timestamps: false });
exports.default = PendingPayment;
