import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.addColumn('user_profiles', 'phone_encrypted', {
      type: DataTypes.TEXT,
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('user_profiles', 'phone_hash', {
      type: DataTypes.STRING(64),
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('user_profiles', 'phone_verified', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }, { transaction });

    await queryInterface.addColumn('user_profiles', 'phone_otp_code', {
      type: DataTypes.STRING(6),
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('user_profiles', 'phone_otp_expires_at', {
      type: DataTypes.DATE,
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('user_profiles', 'phone_otp_attempts', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    await queryInterface.removeColumn('user_profiles', 'phone_encrypted', { transaction });
    await queryInterface.removeColumn('user_profiles', 'phone_hash', { transaction });
    await queryInterface.removeColumn('user_profiles', 'phone_verified', { transaction });
    await queryInterface.removeColumn('user_profiles', 'phone_otp_code', { transaction });
    await queryInterface.removeColumn('user_profiles', 'phone_otp_expires_at', { transaction });
    await queryInterface.removeColumn('user_profiles', 'phone_otp_attempts', { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
