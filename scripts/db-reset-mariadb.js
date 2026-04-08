#!/usr/bin/env node

/**
 * db-reset-mariadb.js — Safe MariaDB/MySQL database reset script
 *
 * `prisma migrate reset` issues DROP TABLE statements one-by-one. In
 * MariaDB/MySQL, tables with ON DELETE RESTRICT foreign keys pointing at them
 * (e.g. ProductVariant → Product) will block the drop. Unlike PostgreSQL,
 * there is no `DROP TABLE … CASCADE` that also removes FKs.
 *
 * This script works around that by:
 *   1. Setting FOREIGN_KEY_CHECKS = 0
 *   2. Dropping every table in the database
 *   3. Re-enabling FOREIGN_KEY_CHECKS
 *   4. Running `prisma migrate deploy` to recreate the schema from scratch
 *   5. (Optional) running the seed
 *
 * Run: npm run db:reset
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function bail(msg) { console.error('\n' + msg + '\n'); process.exit(1); }

// ── Load .env ─────────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) bail('❌  .env file not found.');

const envVars = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  envVars[key] = val;
}

// ── Rudimentary guard ─────────────────────────────────────────────────────────
// Prevent accidental reset of a production database unless explicitly confirmed.

const NODE_ENV = (envVars['NODE_ENV'] || process.env.NODE_ENV || '').toLowerCase();
if (NODE_ENV === 'production') {
  const confirmed = process.argv.includes('--force-prod');
  if (!confirmed) {
    bail(
      '❌  NODE_ENV is "production". Refusing to reset.\n' +
      '    Pass --force-prod if you really want to wipe the production database.'
    );
  }
  log('⚠️   --force-prod supplied. Proceeding with production database reset.');
}

// ── Parse DATABASE_URL ────────────────────────────────────────────────────────

let rawUrl = envVars['DATABASE_URL'] || '';

// Normalise jdbc: prefixes used by some cPanel environments
rawUrl = rawUrl
  .replace(/^jdbc:mariadb:\/\//i, 'mariadb://')
  .replace(/^jdbc:mysql:\/\//i, 'mysql://');

if (!rawUrl || !/^(mariadb|mysql):\/\//i.test(rawUrl)) {
  bail(
    '❌  DATABASE_URL must start with mysql:// or mariadb:// for this script.\n' +
    '    Use the db:setup (PostgreSQL) script for Postgres databases.'
  );
}

let parsed;
try { parsed = new URL(rawUrl); }
catch { bail('❌  DATABASE_URL has an invalid format.'); }

const DB_HOST = parsed.hostname;
const DB_PORT = parseInt(parsed.port || '3306', 10);
const DB_USER = parsed.username;
const DB_PASS = parsed.password ? decodeURIComponent(parsed.password) : '';
const DB_NAME = parsed.pathname.replace(/^\//, '');

log('');
log('🔄  MariaDB / MySQL Database Reset');
log('─────────────────────────────────────');
log(`  Host     : ${DB_HOST}:${DB_PORT}`);
log(`  Database : ${DB_NAME}`);
log(`  User     : ${DB_USER}`);
log('─────────────────────────────────────');
log('');

// ── Connect and wipe ──────────────────────────────────────────────────────────

(async () => {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });

    log('🗑️   Step 1: Dropping all tables (FK checks disabled)…');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const rows = await conn.query(
      `SELECT table_name AS name
         FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type   = 'BASE TABLE'`,
      [DB_NAME]
    );

    if (rows.length === 0) {
      log('    ℹ️   No tables found – database is already empty.');
    } else {
      for (const { name } of rows) {
        // Backtick-quote to handle reserved words safely
        await conn.query(`DROP TABLE IF EXISTS \`${name}\``);
        log(`    ✅  Dropped: ${name}`);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    log('');

  } catch (err) {
    bail(`❌  Database connection / drop failed:\n    ${err.message}`);
  } finally {
    if (conn) await conn.end();
  }

  // ── Re-apply migrations ─────────────────────────────────────────────────────

  log('🚀  Step 2: Applying migrations…');
  try {
    execSync('npx prisma migrate deploy --config=prisma/prisma.config.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch {
    bail('❌  prisma migrate deploy failed. Check the output above.');
  }
  log('');

  // ── Generate Prisma client ──────────────────────────────────────────────────

  log('⚙️   Step 3: Generating Prisma client…');
  try {
    execSync('npx prisma generate --config=prisma/prisma.config.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch {
    bail('❌  prisma generate failed. Check the output above.');
  }

  log('');
  log('✅  Database reset complete.');
  log('');
})();
