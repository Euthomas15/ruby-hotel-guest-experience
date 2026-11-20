const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : null;

async function initializePaymentDatabase() {
  if (!pool) {
    throw new Error("DATABASE_URL must be set for PostgreSQL payments.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGSERIAL PRIMARY KEY,
      reference VARCHAR(32) UNIQUE NOT NULL,
      booking_reference VARCHAR(32) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      provider VARCHAR(32) NOT NULL DEFAULT 'paystack',
      provider_reference VARCHAR(128),
      provider_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payments_booking_reference_unique
    ON payments (booking_reference)
  `);
}

module.exports = { pool, initializePaymentDatabase };
