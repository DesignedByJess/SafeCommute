import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface TripAttributes {
  id?: string;
  user_id: string;
  share_token: string;
  share_link_expires_at?: Date | null;
  share_link_revoked: boolean;
  origin_lat: number;
  origin_lng: number;
  origin_address?: string | null;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  vehicle_plate_encrypted: string;
  vehicle_plate_data_key_encrypted: string;
  contact_id?: string | null;
  contact_name: string;
  contact_phone_encrypted: string;
  safety_notes?: any;
  status: string;
  started_at?: Date;
  ended_at?: Date | null;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class Trip extends Model<TripAttributes> implements TripAttributes {
  public id!: string;
  public user_id!: string;
  public share_token!: string;
  public share_link_expires_at!: Date | null;
  public share_link_revoked!: boolean;
  public origin_lat!: number;
  public origin_lng!: number;
  public origin_address!: string | null;
  public destination_lat!: number;
  public destination_lng!: number;
  public destination_address!: string;
  public vehicle_plate_encrypted!: string;
  public vehicle_plate_data_key_encrypted!: string;
  public contact_id!: string | null;
  public contact_name!: string;
  public contact_phone_encrypted!: string;
  public safety_notes!: any;
  public status!: string;
  public readonly started_at!: Date;
  public ended_at!: Date | null;
  public expires_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Trip.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    share_token: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    share_link_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    share_link_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    origin_lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    origin_lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    origin_address: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    destination_lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    destination_lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    destination_address: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    vehicle_plate_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    vehicle_plate_data_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contact_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    contact_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    contact_phone_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    safety_notes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['active', 'completed', 'emergency']],
      },
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'trips',
    timestamps: false,
  }
);

export default Trip;
