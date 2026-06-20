import { Model, DataTypes } from 'sequelize';
import sequelize from './index';

export interface EmergencyAlertAttributes {
  id?: string;
  trip_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  triggered_at?: Date;
  retracted_at?: Date | null;
  retraction_reason?: string | null;
  verified: boolean;
}

export class EmergencyAlert extends Model<EmergencyAlertAttributes> implements EmergencyAlertAttributes {
  public id!: string;
  public trip_id!: string;
  public lat!: number;
  public lng!: number;
  public accuracy!: number | null;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public readonly triggered_at!: Date;
  public retracted_at!: Date | null;
  public retraction_reason!: string | null;
  public verified!: boolean;
}

EmergencyAlert.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    accuracy: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    triggered_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    retracted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    retraction_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'emergency_alerts',
    timestamps: false,
  }
);

export default EmergencyAlert;
