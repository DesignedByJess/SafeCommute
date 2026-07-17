import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface UserProfileAttributes {
  user_id: string;
  onboarding_complete: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class UserProfile extends Model<UserProfileAttributes> implements UserProfileAttributes {
  public user_id!: string;
  public onboarding_complete!: boolean;
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
