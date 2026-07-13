"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contact = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../database/sequelize"));
class Contact extends sequelize_1.Model {
}
exports.Contact = Contact;
Contact.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    phone_number_encrypted: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    phone_number_hash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
    },
    relationship: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    verified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    otp_code: {
        type: sequelize_1.DataTypes.STRING(6),
        allowNull: true,
    },
    otp_expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
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
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.default,
    tableName: 'contacts',
    timestamps: false,
    paranoid: true,
    deletedAt: 'deleted_at',
});
exports.default = Contact;
