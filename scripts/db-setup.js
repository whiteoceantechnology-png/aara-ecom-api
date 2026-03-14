#!/usr/bin/env node

/**
 * db-setup.js — Cross-platform database setup script (Windows + macOS + Linux)
 *
 * Uses the 'pg' npm package directly — no psql binary needed, no PATH issues,
 * no password prompts. Works identically on Windows, macOS, and Linux.
 *
 * What this does:
 *   1. Reads DATABASE_URL from .env
 *   2. Creates the PostgreSQL user (if not exists)
 *   3. Creates the database (if not exists)
 *   4. Grants all privileges
 *   5. Runs Prisma migrations
 *   6. Generates Prisma client
 *
 * Run: npm run db:setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(msg);
}

function bail(msg, hint) {
  console.error('\n' + msg);
  if (hint) console.error('\n' + hint);
  console.error('');
  process.exit(1);
}

// ── Load .env ─────────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  bail(
    '❌  .env file not found.',
    '👉  Fix: Copy .env.example to .env\n' +
    '         Windows : copy .env.example .env\n' +
    '         Mac/Linux: cp .env.example .env\n' +
    '    Then fill in your values and run npm run db:setup again.'
  );
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  envVars[key] = val;
}

// ── Read DATABASE_URL ─────────────────────────────────────────────────────────

const dbUrl = envVars['DATABASE_URL'];
if (!dbUrl || dbUrl.includes('YOUR_POSTGRES_PASSWORD')) {
  bail(
    '❌  DATABASE_URL is not configured in your .env file.',
    '👉  Fix: Open .env and replace YOUR_POSTGRES_PASSWORD with your actual PostgreSQL password.\n' +
    '    Example:\n' +
    '      DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"'
  );
}

// ── Parse DATABASE_URL ────────────────────────────────────────────────────────

let parsed;
try {
  parsed = new URL(dbUrl);
} catch {
  bail(
    '❌  DATABASE_URL in .env has an invalid format.',
    '👉  Fix: It should look like:\n' +
    '      DATABASE_URL="postgresql://admin:yourpassword@localhost:5432/ecomdb"'
  );
}

const DB_USER = parsed.username;
const DB_PASS = parsed.password ? decodeURIComponent(parsed.password) : null;
const DB_HOST = parsed.hostname;
const DB_PORT = parseInt(parsed.port || '5432', 10);
const DB_NAME = parsed.pathname.replace(/^\//, '');

// ── Read superuser password ───────────────────────────────────────────────────
//
// On Windows, PostgreSQL's default superuser 'postgres' requires a password.
// On macOS/Linux with trust auth, no password is needed (leave blank).
//
// The user sets POSTGRES_SUPERUSER_PASSWORD in .env (see .env.example).

const SUPERUSER_PASS =
  envVars['POSTGRES_SUPERUSER_PASSWORD'] ||
  process.env.POSTGRES_SUPERUSER_PASSWORD ||
  '';

// ── Detect Windows with no superuser password set ────────────────────────────
// On Windows, PostgreSQL always requires a password for the 'postgres' user.
// If POSTGRES_SUPERUSER_PASSWORD is empty, the pg client throws a SASL error.
// Detect this early and give a clear message instead of a cryptic crash.

const isWindows = process.platform === 'win32';
if (isWindows && !SUPERUSER_PASS) {
  bail(
    '❌  POSTGRES_SUPERUSER_PASSWORD is not set in your .env file.',
    '👉  Fix: Open .env in Notepad and add your PostgreSQL install password:\n\n' +
    '      POSTGRES_SUPERUSER_PASSWORD=mypassword123\n\n' +
    '    Also make sure DATABASE_URL includes the same password:\n\n' +
    '      DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"\n\n' +
    '    Use the password you set when you installed PostgreSQL.'
  );
}

// ── Validate .env is complete ─────────────────────────────────────────────────

if (!DB_PASS && SUPERUSER_PASS) {
  bail(
    '❌  DATABASE_URL has no password but POSTGRES_SUPERUSER_PASSWORD is set.',
    '👉  Fix: On Windows, both must have the same password.\n' +
    '    Update DATABASE_URL in .env to include the password:\n' +
    '      DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"\n' +
    '      POSTGRES_SUPERUSER_PASSWORD=mypassword123'
  );
}

// ── Print summary ─────────────────────────────────────────────────────────────

log('\n🔧  Database Setup');
log('─────────────────────────────────────────────────');
log(`  Host          : ${DB_HOST}:${DB_PORT}`);
log(`  Database      : ${DB_NAME}`);
log(`  App User      : ${DB_USER}`);
log(`  App Password  : ${DB_PASS ? '(set)' : '(none — trust auth)'}`);
log(`  Superuser pwd : ${SUPERUSER_PASS ? '(set)' : '(none — trust auth)'}`);
log('─────────────────────────────────────────────────\n');

// ── pg superuser client (connects to 'postgres' maintenance DB) ───────────────

function makeClient(database = 'postgres') {
  return new Client({
    host: DB_HOST,
    port: DB_PORT,
    database,
    user: 'postgres',
    // Always pass a string — pg throws SASL error if password is undefined
    password: SUPERUSER_PASS || null,
  });
}

async function query(sql, database = 'postgres') {
  const client = makeClient(database);
  try {
    await client.connect();
    const res = await client.query(sql);
    return res;
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Main setup (async) ────────────────────────────────────────────────────────

async function main() {

  // ── Step 1: Create user ─────────────────────────────────────────────────────

  log('👤  Step 1: Creating PostgreSQL user...');
  try {
    const check = await query(
      `SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'`
    );
    if (check.rows.length > 0) {
      // User exists — always sync the password to match DATABASE_URL.
      // This fixes the case where the user was previously created without
      // a password (or with a different one) and Prisma now rejects it.
      if (DB_PASS) {
        await query(`ALTER USER "${DB_USER}" WITH PASSWORD '${DB_PASS}'`);
        log(`    ✅  User '${DB_USER}' already exists — password updated to match DATABASE_URL.\n`);
      } else {
        log(`    ✅  User '${DB_USER}' already exists.\n`);
      }
    } else {
      const createSql = DB_PASS
        ? `CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASS}'`
        : `CREATE USER "${DB_USER}"`;
      await query(createSql);
      log(`    ✅  User '${DB_USER}' created.\n`);
    }
  } catch (err) {
    const msg = (err.message || '').toString();

    if (msg.includes('password authentication failed') || msg.includes('no pg_hba.conf entry')) {
      bail(
        '❌  PostgreSQL rejected the superuser password.',
        '👉  Fix: Open your .env file and set the correct POSTGRES_SUPERUSER_PASSWORD.\n' +
        '    This is the password you chose when you installed PostgreSQL.\n\n' +
        '    Example (in .env):\n' +
        '      POSTGRES_SUPERUSER_PASSWORD=mypassword123'
      );
    }

    if (msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED')) {
      bail(
        '❌  Cannot connect to PostgreSQL. Is it running?',
        '👉  Fix for Windows:\n' +
        '    Press Win+S → search "Services" → find "postgresql-x64-17" → Right-click → Start.\n\n' +
        '👉  Fix for macOS:\n' +
        '    Run: brew services start postgresql'
      );
    }

    bail(
      '❌  Could not create the database user.\n    Error: ' + msg,
      '👉  Make sure:\n' +
      '    1. PostgreSQL is running\n' +
      '    2. POSTGRES_SUPERUSER_PASSWORD in .env matches your PostgreSQL install password'
    );
  }

  // ── Step 2: Create database ─────────────────────────────────────────────────

  log('🗄️   Step 2: Creating database...');
  try {
    const check = await query(
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`
    );
    if (check.rows.length > 0) {
      log(`    ✅  Database '${DB_NAME}' already exists.\n`);
    } else {
      // CREATE DATABASE cannot run in a transaction, use a fresh client
      await query(`CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"`);
      log(`    ✅  Database '${DB_NAME}' created.\n`);
    }
  } catch (err) {
    bail(
      '❌  Could not create database.\n    Error: ' + err.message,
      '👉  Make sure POSTGRES_SUPERUSER_PASSWORD in .env is correct.'
    );
  }

  // ── Step 3: Grant privileges ────────────────────────────────────────────────

  log('🔑  Step 3: Granting privileges...');
  try {
    await query(`GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}"`);
    await query(`ALTER DATABASE "${DB_NAME}" OWNER TO "${DB_USER}"`, DB_NAME);
    log(`    ✅  Privileges granted.\n`);
  } catch (err) {
    bail(
      '❌  Could not grant privileges.\n    Error: ' + err.message,
      '👉  Make sure POSTGRES_SUPERUSER_PASSWORD in .env is correct.'
    );
  }

  // ── Step 4: Run Prisma migrations ──────────────────────────────────────────

  log('📦  Step 4: Running Prisma migrations...');
  try {
    execSync(
      'npx prisma migrate deploy --schema=prisma/schema.prisma --config=prisma/prisma.config.ts',
      {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: dbUrl },
      },
    );
    log('    ✅  Migrations applied.\n');
  } catch {
    bail(
      '❌  Prisma migration failed.',
      '👉  Most likely cause: the password in DATABASE_URL does not match the admin user password.\n' +
      '    Make sure DATABASE_URL in .env includes the correct password:\n' +
      '      DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"'
    );
  }

  // ── Step 5: Generate Prisma client ─────────────────────────────────────────

  log('⚙️   Step 5: Generating Prisma client...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    log('    ✅  Prisma client generated.\n');
  } catch {
    bail('❌  Prisma generate failed. Check the error above.');
  }

  // ── Done ────────────────────────────────────────────────────────────────────

  log('');
  log('🎉  Setup complete! You can now start the API:');
  log('');
  log('    npm run start:dev');
  log('');
  log('    Then open: http://localhost:3008/api/docs');
  log('');
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
