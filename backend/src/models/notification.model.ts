import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface NotificationAttributes {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_entity_id: string | null;
  created_at?: Date;
}

export class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
  public id!: string;
  public user_id!: string;
  public type!: string;
  public title!: string;
  public message!: string;
  public read!: boolean;
  public related_entity_id!: string | null;
  public readonly created_at!: Date;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    related_entity_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, tableName: 'notifications', timestamps: false }
);

export default Notification;
