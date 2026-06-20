import { Model, DataTypes } from 'sequelize';
import sequelize from '../database/sequelize';

export interface TripLocationAttributes {
  id?: string;
  trip_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  recorded_at?: Date;
}

export class TripLocation extends Model<TripLocationAttributes> implements TripLocationAttributes {
  public id!: string;
  public trip_id!: string;
  public lat!: number;
  public lng!: number;
  public accuracy!: number | null;
  public readonly recorded_at!: Date;
}

TripLocation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    accuracy: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    recorded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'trip_locations',
    timestamps: false,
  }
);

export default TripLocation;
