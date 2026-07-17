import sequelize from '../database/sequelize';

import Contact from './contact.model';
import Trip from './trip.model';
import TripLocation from './trip-location.model';
import EmergencyAlert from './emergency-alert.model';
import EncryptionKey from './encryption-key.model';
import AuditLog from './audit.model';
import PendingPayment from './pending-payment.model';
import Subscription from './subscription.model';
import UserProfile from './user-profile.model';

Contact.hasMany(Trip, { foreignKey: 'contact_id', as: 'trips' });
Trip.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

Trip.hasMany(TripLocation, { foreignKey: 'trip_id', as: 'locations' });
TripLocation.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

Trip.hasMany(EmergencyAlert, { foreignKey: 'trip_id', as: 'emergencyAlerts' });
EmergencyAlert.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

export {
  sequelize,
  Contact, Trip, TripLocation, EmergencyAlert,
  EncryptionKey, AuditLog, PendingPayment, Subscription, UserProfile,
};

export default sequelize;
