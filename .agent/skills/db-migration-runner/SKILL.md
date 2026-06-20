# Skill: db-migration-runner

## Purpose

Generate safe, idempotent PostgreSQL migrations for SafeCommute using Sequelize migrations. Every migration follows the schema conventions, encryption requirements, and data retention policies in the PRD.

-----

## When to Use

Trigger this skill when asked to:

- “Create a migration for ___”
- “Add a column to the ___ table”
- “Write a DB migration to ___”
- “Update the schema for ___”

-----

## Migration File Convention

**Location:** `/backend/src/database/migrations/`
**Naming:** `YYYYMMDDHHMMSS-description-of-change.ts`

Example: `20260615120000-add-share-link-revoked-to-trips.ts`

-----

## Migration Template

```ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
// Always wrap multi-step migrations in a transaction
const transaction = await queryInterface.sequelize.transaction();
try {
await queryInterface.addColumn(
'trips',
'share_link_revoked',
{
type: DataTypes.BOOLEAN,
defaultValue: false,
allowNull: false,
},
{ transaction }
);

// Add index if needed for query performance
await queryInterface.addIndex('trips', ['share_link_revoked'], {
name: 'idx_trips_share_link_revoked',
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
await queryInterface.removeIndex('trips', 'idx_trips_share_link_revoked', { transaction });
await queryInterface.removeColumn('trips', 'share_link_revoked', { transaction });
await transaction.commit();
} catch (err) {
await transaction.rollback();
throw err;
}
}
```

-----

## Schema Reference (Core Tables)

### `contacts`

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL -- Supabase Auth User ID
name VARCHAR(50) NOT NULL
phone_number_encrypted TEXT NOT NULL -- AES-256 encrypted
phone_number_hash VARCHAR(64) UNIQUE -- SHA-256 for deduplication
relationship VARCHAR(20)
verified BOOLEAN DEFAULT FALSE
otp_code VARCHAR(6)
otp_expires_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
deleted_at TIMESTAMP -- soft delete

INDEXES: idx_contacts_user_id, idx_contacts_phone_hash
```

### `trips`

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL -- Supabase Auth User ID
share_token VARCHAR(32) UNIQUE NOT NULL
share_link_expires_at TIMESTAMP
share_link_revoked BOOLEAN DEFAULT FALSE
origin_lat / origin_lng DECIMAL(10, 7) NOT NULL
origin_address VARCHAR(200)
destination_lat / destination_lng DECIMAL(10, 7) NOT NULL
destination_address VARCHAR(200) NOT NULL
vehicle_plate_encrypted TEXT NOT NULL
vehicle_plate_data_key_encrypted TEXT NOT NULL
contact_id UUID REFERENCES contacts(id)
contact_name VARCHAR(50) NOT NULL
contact_phone_encrypted TEXT NOT NULL
safety_notes JSONB
status VARCHAR(20) CHECK (status IN ('active','completed','emergency'))
started_at TIMESTAMP DEFAULT NOW()
ended_at TIMESTAMP
expires_at TIMESTAMP NOT NULL -- 30-day auto-delete
created_at / updated_at TIMESTAMP

INDEXES: idx_trips_user_id, idx_trips_share_token, idx_trips_status, idx_trips_expires_at
```

### `trip_locations`

```sql
id UUID PRIMARY KEY
trip_id UUID REFERENCES trips(id) ON DELETE CASCADE
lat DECIMAL(10, 7) NOT NULL
lng DECIMAL(10, 7) NOT NULL
accuracy DECIMAL(5, 2)
recorded_at TIMESTAMP DEFAULT NOW()

INDEXES: idx_trip_locations_trip_id, idx_trip_locations_recorded_at
NOTE: No expires_at — rows deleted immediately when trip ends via ON DELETE CASCADE
```

### `emergency_alerts`

```sql
id UUID PRIMARY KEY
trip_id UUID REFERENCES trips(id)
lat / lng DECIMAL(10, 7) NOT NULL
accuracy DECIMAL(5, 2)
ip_address INET
user_agent TEXT
triggered_at TIMESTAMP DEFAULT NOW()
retracted_at TIMESTAMP
retraction_reason TEXT
verified BOOLEAN DEFAULT FALSE

INDEXES: idx_emergency_alerts_trip_id, idx_emergency_alerts_triggered_at
```

### `audit_logs`

```sql
id BIGSERIAL PRIMARY KEY
user_id UUID -- Supabase Auth User ID
event_type VARCHAR(50) NOT NULL
event_data JSONB
ip_address INET
user_agent TEXT
created_at TIMESTAMP DEFAULT NOW()

INDEXES: idx_audit_logs_user_id, idx_audit_logs_event_type, idx_audit_logs_created_at
```

### `encryption_keys`

```sql
id SERIAL PRIMARY KEY
key_version INTEGER UNIQUE NOT NULL
master_key_encrypted TEXT NOT NULL
created_at TIMESTAMP DEFAULT NOW()
rotated_at TIMESTAMP
active BOOLEAN DEFAULT TRUE

INDEXES: idx_encryption_keys_key_version, idx_encryption_keys_active
```

-----

## Rules for Every Migration

- [ ] Always wrap multi-step changes in a **transaction** — rollback on failure
- [ ] Always provide both `up` and `down` functions
- [ ] `down` must fully reverse `up` — including indexes
- [ ] Sensitive columns (phone numbers, plates) must be `TEXT` (encrypted blob) — never plain `VARCHAR` with the actual value
- [ ] Use `DECIMAL(10, 7)` for all lat/lng — never `FLOAT`
- [ ] Status columns use `CHECK` constraints — not just application-level enforcement
- [ ] Add indexes for every foreign key and any column used in WHERE clauses
- [ ] UUID primary keys: `DEFAULT gen_random_uuid()` — never auto-increment for user-facing IDs
- [ ] Soft-delete columns: `deleted_at TIMESTAMP` (nullable) — not a `deleted BOOLEAN`
- [ ] Auto-expiry columns: `expires_at TIMESTAMP NOT NULL` on trips

-----

## Run Commands

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Roll back last migration
npx sequelize-cli db:migrate:undo

# Roll back all migrations
npx sequelize-cli db:migrate:undo:all

# Generate migration file stub
npx sequelize-cli migration:generate --name add-share-link-revoked-to-trips
```

-----

## Automated Deletion (Cron Jobs)

Set up these scheduled jobs alongside migrations when adding expiry columns:

```ts
// Delete expired trips (runs daily at 2 AM WAT)
DELETE FROM trips WHERE expires_at < NOW();

// Hard delete soft-deleted contacts after 7 days
DELETE FROM contacts WHERE deleted_at < NOW() - INTERVAL '7 days';

// Purge audit logs older than 30 days
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
```

Maintenance window: **Sundays 2–4 AM WAT** (per PRD SLA).