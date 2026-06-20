import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.createTable('pending_payments', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      tx_ref: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      plan: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'NGN',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.fn('now'),
      },
    }, { transaction });

    await queryInterface.addIndex('pending_payments', ['user_id'], {
      name: 'idx_pending_payments_user_id',
      transaction,
    });
    await queryInterface.addIndex('pending_payments', ['tx_ref'], {
      name: 'idx_pending_payments_tx_ref',
      transaction,
    });

    await queryInterface.createTable('subscriptions', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      plan: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      starts_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      tx_ref: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.fn('now'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.fn('now'),
      },
    }, { transaction });

    await queryInterface.addIndex('subscriptions', ['user_id'], {
      name: 'idx_subscriptions_user_id',
      transaction,
    });
    await queryInterface.addIndex('subscriptions', ['status'], {
      name: 'idx_subscriptions_status',
      transaction,
    });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.dropTable('subscriptions', { transaction });
    await queryInterface.dropTable('pending_payments', { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
