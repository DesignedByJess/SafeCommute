import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface PendingPaymentAttributes {
  id?: string;
  tx_ref: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: Date;
}

export class PendingPayment extends Model<PendingPaymentAttributes> implements PendingPaymentAttributes {
  public id!: string;
  public tx_ref!: string;
  public user_id!: string;
  public plan!: string;
  public amount!: number;
  public currency!: string;
  public status!: string;
  public readonly created_at!: Date;
}

PendingPayment.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tx_ref: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    plan: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING(3), defaultValue: 'NGN', allowNull: false },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending', allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, tableName: 'pending_payments', timestamps: false }
);

export default PendingPayment;
