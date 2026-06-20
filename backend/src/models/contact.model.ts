import { Model, DataTypes } from 'sequelize';
import sequelize from './index';

export interface ContactAttributes {
  id?: string;
  user_id: string;
  name: string;
  phone_number_encrypted: string;
  phone_number_hash: string;
  relationship?: string | null;
  verified: boolean;
  otp_code?: string | null;
  otp_expires_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export class Contact extends Model<ContactAttributes> implements ContactAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public phone_number_encrypted!: string;
  public phone_number_hash!: string;
  public relationship!: string | null;
  public verified!: boolean;
  public otp_code!: string | null;
  public otp_expires_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;
}

Contact.init(
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    phone_number_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    phone_number_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    relationship: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'contacts',
    timestamps: false,
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

export default Contact;
