import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface SubscriptionAttributes {
  id?: string;
  user_id: string;
  plan: string;
  status: string;
  starts_at: Date;
  expires_at: Date;
  tx_ref: string;
  created_at?: Date;
  updated_at?: Date;
}

export class Subscription extends Model<SubscriptionAttributes> implements SubscriptionAttributes {
  public id!: string;
  public user_id!: string;
  public plan!: string;
  public status!: string;
  public starts_at!: Date;
  public expires_at!: Date;
  public tx_ref!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Subscription.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    plan: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    tx_ref: { type: DataTypes.STRING(64), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, tableName: 'subscriptions', timestamps: false }
);

export default Subscription;
