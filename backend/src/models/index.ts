import { Sequelize } from 'sequelize';
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const config = require('../database/config.js')[env];

export const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable] as string, config)
  : new Sequelize(config.database, config.username, config.password, config);

import Contact from './contact.model';
import Trip from './trip.model';
import TripLocation from './trip-location.model';
import EmergencyAlert from './emergency-alert.model';
import EncryptionKey from './encryption-key.model';
import AuditLog from './audit.model';
import PendingPayment from './pending-payment.model';
import Subscription from './subscription.model';

Contact.hasMany(Trip, { foreignKey: 'contact_id', as: 'trips' });
Trip.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

Trip.hasMany(TripLocation, { foreignKey: 'trip_id', as: 'locations' });
TripLocation.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

Trip.hasMany(EmergencyAlert, { foreignKey: 'trip_id', as: 'emergencyAlerts' });
EmergencyAlert.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

export {
  Contact, Trip, TripLocation, EmergencyAlert,
  EncryptionKey, AuditLog, PendingPayment, Subscription,
};

export default sequelize;
