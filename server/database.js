'use strict';
const { Pool } = require('pg');

let pool;

function getDB() {
  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Use explicit SSL object to avoid pg v8→v9 ssl-mode deprecation warning.
      // In production: connect with SSL but accept self-signed certs (Render/Neon default).
      // In dev: no SSL unless DATABASE_URL already contains sslmode.
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('PG pool error:', err.message));
  }
  return pool;
}

/* ── Run schema + migrations on startup ─────────────────────── */
async function initDB() {
  const db = getDB();

  // ── Step 1: Create base tables (safe on existing DBs) ────────
  // Each statement is run individually so a failure in one doesn't
  // silently skip the rest (unlike a single multi-statement string).
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      enrollment    TEXT NOT NULL UNIQUE,
      department    TEXT NOT NULL DEFAULT '',
      year          TEXT NOT NULL DEFAULT '',
      program       TEXT DEFAULT '',
      semester      TEXT DEFAULT '',
      contact       TEXT DEFAULT '',
      phone         TEXT NOT NULL DEFAULT '',
      avatar_url    TEXT DEFAULT '',
      bio           TEXT DEFAULT '',
      password_hash TEXT DEFAULT '',
      session_id    TEXT UNIQUE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS marketplace (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      price       INTEGER NOT NULL DEFAULT 0,
      category    TEXT DEFAULT 'other',
      condition   TEXT DEFAULT 'good',
      contact     TEXT DEFAULT '',
      image_url   TEXT,
      status      TEXT DEFAULT 'active',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      subject     TEXT NOT NULL,
      semester    INTEGER NOT NULL DEFAULT 0,
      type        TEXT DEFAULT 'notes',
      department  TEXT DEFAULT '',
      program     TEXT DEFAULT '',
      exam_type   TEXT DEFAULT '',
      year        INTEGER DEFAULT 0,
      file_url    TEXT DEFAULT '',
      file_name   TEXT DEFAULT '',
      drive_link  TEXT DEFAULT '',
      downloads   INTEGER DEFAULT 0,
      status      TEXT DEFAULT 'approved',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS lost_found (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT DEFAULT 'item',
      type        TEXT DEFAULT 'lost',
      location    TEXT NOT NULL,
      contact     TEXT DEFAULT '',
      image_url   TEXT,
      status      TEXT DEFAULT 'open',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title             TEXT NOT NULL,
      description       TEXT NOT NULL,
      category          TEXT DEFAULT 'other',
      venue             TEXT NOT NULL,
      event_date        TEXT NOT NULL,
      event_time        TEXT DEFAULT '',
      organizer         TEXT NOT NULL,
      contact           TEXT DEFAULT '',
      registration_link TEXT DEFAULT '',
      image_url         TEXT,
      status            TEXT DEFAULT 'upcoming',
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name       TEXT DEFAULT '',
      title      TEXT DEFAULT '',
      body       TEXT NOT NULL,
      category   TEXT DEFAULT 'general',
      rating     INTEGER CHECK (rating >= 1 AND rating <= 5),
      status     TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of tables) {
    await db.query(sql);
  }

  // ── Step 2: ADD COLUMN migrations (idempotent, run before indexes) ──
  // These must run BEFORE any index creation that references the new columns,
  // and before the server starts handling requests that SELECT those columns.
  const columnMigrations = [
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5)`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS name   TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip   TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_logins   INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ`,
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT ''`,
    // Unique constraint on phone (deduplicate first to avoid constraint violation)
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_phone_unique' AND conrelid = 'users'::regclass
      ) THEN
        UPDATE users SET phone = phone || '_dup' || id
        WHERE phone != '' AND id NOT IN (
          SELECT MIN(id) FROM users WHERE phone != '' GROUP BY phone
        );
        ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
      END IF;
    END $$`,
  ];

  for (const sql of columnMigrations) {
    await db.query(sql).catch(e => console.warn('[migration skipped]', e.message));
  }

  // ── Step 3: Create indexes (safe now that all columns exist) ──
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_usr_sid    ON users(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_usr_ph     ON users(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_usr_locked ON users(locked_until)`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_status ON marketplace(status)`,
    `CREATE INDEX IF NOT EXISTS idx_mkt_uid    ON marketplace(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_nts_type   ON notes(type)`,
    `CREATE INDEX IF NOT EXISTS idx_nts_dept   ON notes(department)`,
    `CREATE INDEX IF NOT EXISTS idx_nts_status ON notes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_nts_uid    ON notes(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lf_status  ON lost_found(status)`,
    `CREATE INDEX IF NOT EXISTS idx_lf_uid     ON lost_found(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ev_date    ON events(event_date)`,
    `CREATE INDEX IF NOT EXISTS idx_ev_status  ON events(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ev_uid     ON events(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fb_uid     ON feedback(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_rst_token  ON password_reset_tokens(token)`,
    `CREATE INDEX IF NOT EXISTS idx_rst_uid    ON password_reset_tokens(user_id)`,
  ];

  for (const sql of indexes) {
    await db.query(sql).catch(e => console.warn('[index skipped]', e.message));
  }

  console.log('✅ PostgreSQL schema ready');
}

module.exports = { getDB, initDB };
