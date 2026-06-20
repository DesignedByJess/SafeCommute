import { Model, DataTypes } from 'sequelize';
import sequelize from './index';

export interface EncryptionKeyAttributes {
  id?: number;
  key_version: number;
  master_key_encrypted: string;
  active: boolean;
  created_at?: Date;
  rotated_at?: Date | null;
}

export class EncryptionKey extends Model<EncryptionKeyAttributes> implements EncryptionKeyAttributes {
  public id!: number;
  public key_version!: number;
  public master_key_encrypted!: string;
  public active!: boolean;
  public readonly created_at!: Date;
  public rotated_at!: Date | null;
}

EncryptionKey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    master_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    rotated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'encryption_keys',
    timestamps: false,
  }
);

export default EncryptionKey;
