"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripLocation = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../database/sequelize"));
class TripLocation extends sequelize_1.Model {
    id;
    trip_id;
    lat;
    lng;
    accuracy;
    recorded_at;
}
exports.TripLocation = TripLocation;
TripLocation.init({
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
    recorded_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        allowNull: false,
    },
}, {
    sequelize: sequelize_2.default,
    tableName: 'trip_locations',
    timestamps: false,
});
exports.default = TripLocation;
