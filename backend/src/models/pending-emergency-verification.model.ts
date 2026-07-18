import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface PendingEmergencyVerificationAttributes {
  trip_id: string;
  code: string;
  expires_at: Date;
  attempts: number;
  user_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  user_name: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: Date;
}

export class PendingEmergencyVerification extends Model<PendingEmergencyVerificationAttributes> implements PendingEmergencyVerificationAttributes {
  public trip_id!: string;
  public code!: string;
  public expires_at!: Date;
  public attempts!: number;
  public user_id!: string;
  public lat!: number;
  public lng!: number;
  public accuracy!: number | null;
  public user_name!: string;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public readonly created_at!: Date;
}

PendingEmergencyVerification.init(
  {
    trip_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    user_id: {
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
    user_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'pending_emergency_verifications',
    timestamps: false,
  }
);

export default PendingEmergencyVerification;
