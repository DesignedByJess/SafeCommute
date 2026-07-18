import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    // 1. Create pending_emergency_verifications table (replaces in-memory Map)
    await queryInterface.createTable('pending_emergency_verifications', {
      trip_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      user_id: {
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
      user_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
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
        allowNull: false,
        defaultValue: queryInterface.sequelize.fn('now'),
      },
    }, { transaction });

    // 2. Add last_location_at column to trips for atomic rate limiting
    await queryInterface.addColumn('trips', 'last_location_at', {
      type: DataTypes.DATE,
      allowNull: true,
    }, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.removeColumn('trips', 'last_location_at', { transaction });
    await queryInterface.dropTable('pending_emergency_verifications', { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
