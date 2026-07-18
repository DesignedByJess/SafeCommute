import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface SessionAttributes {
  id?: string;
  user_id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at?: Date;
  last_active_at?: Date;
}

export class Session extends Model<SessionAttributes> implements SessionAttributes {
  public id!: string;
  public user_id!: string;
  public user_agent!: string | null;
  public ip_address!: string | null;
  public readonly created_at!: Date;
  public last_active_at!: Date;
}

Session.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    ip_address: { type: DataTypes.INET, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    last_active_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, tableName: 'sessions', timestamps: false }
);

export default Session;
