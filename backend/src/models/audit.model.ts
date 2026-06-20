import { Model, DataTypes } from 'sequelize';
import sequelize from './index';

export interface AuditLogAttributes {
  id?: number;
  user_id?: string | null;
  event_type: string;
  event_data?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: Date;
}

export class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  public id!: number;
  public user_id!: string | null;
  public event_type!: string;
  public event_data!: any;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public readonly created_at!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    event_data: {
      type: DataTypes.JSONB,
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
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
  }
);

export default AuditLog;
