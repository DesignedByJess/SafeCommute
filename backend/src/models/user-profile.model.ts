import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface UserProfileAttributes {
  user_id: string;
  onboarding_complete: boolean;
  phone_encrypted?: string | null;
  phone_hash?: string | null;
  phone_verified?: boolean;
  phone_otp_code?: string | null;
  phone_otp_expires_at?: Date | null;
  phone_otp_attempts?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class UserProfile extends Model<UserProfileAttributes> implements UserProfileAttributes {
  public user_id!: string;
  public onboarding_complete!: boolean;
  public phone_encrypted!: string | null;
  public phone_hash!: string | null;
  public phone_verified!: boolean;
  public phone_otp_code!: string | null;
  public phone_otp_expires_at!: Date | null;
  public phone_otp_attempts!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserProfile.init(
  {
    user_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    onboarding_complete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    phone_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    phone_otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    phone_otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phone_otp_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_profiles',
    timestamps: false,
  }
);

export default UserProfile;
