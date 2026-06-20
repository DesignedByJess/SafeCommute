"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        // 1. Create contacts table
        await queryInterface.createTable('contacts', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                primaryKey: true,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
            },
            user_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            phone_number_encrypted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            phone_number_hash: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            relationship: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
            },
            verified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            otp_code: {
                type: sequelize_1.DataTypes.STRING(6),
                allowNull: true,
            },
            otp_expires_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            updated_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            deleted_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, { transaction });
        await queryInterface.addIndex('contacts', ['user_id'], {
            name: 'idx_contacts_user_id',
            transaction,
        });
        await queryInterface.addIndex('contacts', ['phone_number_hash'], {
            name: 'idx_contacts_phone_hash',
            transaction,
        });
        // 2. Create trips table
        await queryInterface.createTable('trips', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                primaryKey: true,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
            },
            user_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            share_token: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                unique: true,
            },
            share_link_expires_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            share_link_revoked: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            origin_lat: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            origin_lng: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            origin_address: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: true,
            },
            destination_lat: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            destination_lng: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            destination_address: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
            },
            vehicle_plate_encrypted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            vehicle_plate_data_key_encrypted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            contact_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'contacts',
                    key: 'id'
                },
                onDelete: 'SET NULL',
            },
            contact_name: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            contact_phone_encrypted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            safety_notes: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    isIn: [['active', 'completed', 'emergency']]
                }
            },
            started_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            ended_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            expires_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            updated_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            }
        }, { transaction });
        await queryInterface.addIndex('trips', ['user_id'], {
            name: 'idx_trips_user_id',
            transaction,
        });
        await queryInterface.addIndex('trips', ['share_token'], {
            name: 'idx_trips_share_token',
            transaction,
        });
        await queryInterface.addIndex('trips', ['status'], {
            name: 'idx_trips_status',
            transaction,
        });
        await queryInterface.addIndex('trips', ['expires_at'], {
            name: 'idx_trips_expires_at',
            transaction,
        });
        // 3. Create trip_locations table
        await queryInterface.createTable('trip_locations', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                primaryKey: true,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
            },
            trip_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'trips',
                    key: 'id'
                },
                onDelete: 'CASCADE',
            },
            lat: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            lng: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            accuracy: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
            },
            recorded_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            }
        }, { transaction });
        await queryInterface.addIndex('trip_locations', ['trip_id'], {
            name: 'idx_trip_locations_trip_id',
            transaction,
        });
        await queryInterface.addIndex('trip_locations', ['recorded_at'], {
            name: 'idx_trip_locations_recorded_at',
            transaction,
        });
        // 4. Create emergency_alerts table
        await queryInterface.createTable('emergency_alerts', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                primaryKey: true,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
            },
            trip_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'trips',
                    key: 'id'
                },
                onDelete: 'RESTRICT',
            },
            lat: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            lng: {
                type: sequelize_1.DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            accuracy: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
            },
            ip_address: {
                type: sequelize_1.DataTypes.INET,
                allowNull: true,
            },
            user_agent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            triggered_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            retracted_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            retraction_reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            verified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            }
        }, { transaction });
        await queryInterface.addIndex('emergency_alerts', ['trip_id'], {
            name: 'idx_emergency_alerts_trip_id',
            transaction,
        });
        await queryInterface.addIndex('emergency_alerts', ['triggered_at'], {
            name: 'idx_emergency_alerts_triggered_at',
            transaction,
        });
        // 5. Create audit_logs table
        await queryInterface.createTable('audit_logs', {
            id: {
                type: sequelize_1.DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            event_type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            event_data: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            },
            ip_address: {
                type: sequelize_1.DataTypes.INET,
                allowNull: true,
            },
            user_agent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            }
        }, { transaction });
        await queryInterface.addIndex('audit_logs', ['user_id'], {
            name: 'idx_audit_logs_user_id',
            transaction,
        });
        await queryInterface.addIndex('audit_logs', ['event_type'], {
            name: 'idx_audit_logs_event_type',
            transaction,
        });
        await queryInterface.addIndex('audit_logs', ['created_at'], {
            name: 'idx_audit_logs_created_at',
            transaction,
        });
        // 6. Create encryption_keys table
        await queryInterface.createTable('encryption_keys', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            key_version: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                unique: true,
            },
            master_key_encrypted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            active: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.fn('now'),
            },
            rotated_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            }
        }, { transaction });
        await queryInterface.addIndex('encryption_keys', ['key_version'], {
            name: 'idx_encryption_keys_key_version',
            transaction,
        });
        await queryInterface.addIndex('encryption_keys', ['active'], {
            name: 'idx_encryption_keys_active',
            transaction,
        });
        await transaction.commit();
    }
    catch (err) {
        await transaction.rollback();
        throw err;
    }
}
async function down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.dropTable('encryption_keys', { transaction });
        await queryInterface.dropTable('audit_logs', { transaction });
        await queryInterface.dropTable('emergency_alerts', { transaction });
        await queryInterface.dropTable('trip_locations', { transaction });
        await queryInterface.dropTable('trips', { transaction });
        await queryInterface.dropTable('contacts', { transaction });
        await transaction.commit();
    }
    catch (err) {
        await transaction.rollback();
        throw err;
    }
}
