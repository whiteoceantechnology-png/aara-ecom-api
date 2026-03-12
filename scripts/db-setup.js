#!/usr/bin/env node

/**
 * db-setup.js — Cross-platform database setup script (Windows + macOS + Linux)
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

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function log(msg) {
  console.log(msg);
}

// ── Load .env ─────────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('\n❌  .env file not found. Please create one first.');
  console.error('    Copy .env.example to .env and fill in the values.\n');
  process.exit(1);
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

const dbUrl = envVars['DATABASE_URL'];
if (!dbUrl) {
  console.error('\n❌  DATABASE_URL not found in .env\n');
  process.exit(1);
}

// ── Parse DATABASE_URL ────────────────────────────────────────────────────────
// Supports:
//   postgresql://user:password@host:port/dbname
//   postgresql://user@host:port/dbname        (no password / trust auth)

let parsed;
try {
  parsed = new URL(dbUrl);
} catch {
  console.error('\n❌  Invalid DATABASE_URL format in .env');
  console.error('    Expected: postgresql://user:password@host:port/dbname\n');
  process.exit(1);
}

const DB_USER = parsed.username;
const DB_PASS = parsed.password ? decodeURIComponent(parsed.password) : null;
const DB_HOST = parsed.hostname;
const DB_PORT = parsed.port || '5432';
const DB_NAME = parsed.pathname.replace(/^\//, '');

log('\n🔧  Database Setup');
log('─────────────────────────────────────');
log(`  Host     : ${DB_HOST}:${DB_PORT}`);
log(`  Database : ${DB_NAME}`);
log(`  User     : ${DB_USER}`);
log(`  Password : ${DB_PASS ? '(set)' : '(none — trust auth)'}`);
log('─────────────────────────────────────\n');

// ── Build psql env (for password-based auth) ──────────────────────────────────
//
// On Windows, PostgreSQL's default superuser is 'postgres' and it uses
// password auth. The PGPASSWORD env variable is used by psql so it doesn't
// prompt interactively.
//
// The user must set POSTGRES_SUPERUSER_PASSWORD in their environment or .env
// if their postgres superuser requires a password (Windows default).
// We also fall back to DB_PASS if the DB user IS postgres (some setups).
const SUPERUSER_PASS =
  envVars['POSTGRES_SUPERUSER_PASSWORD'] ||
  process.env.POSTGRES_SUPERUSER_PASSWORD ||
  '';

function psql(sql, database = 'postgres') {
  // Pass SQL via stdin (-f -) to avoid shell quoting issues on Windows and Unix
  const env = { ...process.env, PGPASSWORD: SUPERUSER_PASS };
  return execFileSync(
    'psql',
    ['-h', DB_HOST, '-p', DB_PORT, '-U', 'postgres', '-d', database, '-t', '-c', sql],
    { encoding: 'utf8', input: sql, env, stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}

// ── Step 1: Create user ───────────────────────────────────────────────────────
log('👤  Step 1: Creating PostgreSQL user...');
try {
  const exists = psql(`SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'`);
  if (exists.includes('1')) {
    log(`    ✅  User '${DB_USER}' already exists.\n`);
  } else {
    const createSql = DB_PASS
      ? `CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';`
      : `CREATE USER "${DB_USER}";`;
    psql(createSql);
    log(`    ✅  User '${DB_USER}' created.\n`);
  }
} catch (e) {
  console.error(`    ❌  Could not create user. Make sure PostgreSQL is running and your superuser (postgres) has access.`);
  if (process.env.VERBOSE) console.error(e.message);
  process.exit(1);
}

// ── Step 2: Create database ───────────────────────────────────────────────────
log('🗄️   Step 2: Creating database...');
try {
  const exists = psql(`SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`);
  if (exists.includes('1')) {
    log(`    ✅  Database '${DB_NAME}' already exists.\n`);
  } else {
    psql(`CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}";`);
    log(`    ✅  Database '${DB_NAME}' created.\n`);
  }
} catch (e) {
  console.error(`    ❌  Could not create database.`);
  if (process.env.VERBOSE) console.error(e.message);
  process.exit(1);
}

// ── Step 3: Grant privileges ──────────────────────────────────────────────────
log('🔑  Step 3: Granting privileges...');
try {
  psql(`GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";`);
  psql(`ALTER DATABASE "${DB_NAME}" OWNER TO "${DB_USER}";`, DB_NAME);
  log(`    ✅  Privileges granted.\n`);
} catch (e) {
  console.error(`    ❌  Could not grant privileges.`);
  if (process.env.VERBOSE) console.error(e.message);
  process.exit(1);
}

// ── Step 4: Run Prisma migrations ─────────────────────────────────────────────
log('📦  Step 4: Running Prisma migrations...');
try {
  run('npx prisma migrate deploy --schema=prisma/schema.prisma --config=prisma/prisma.config.ts', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  log('    ✅  Migrations applied.\n');
} catch (e) {
  console.error('    ❌  Prisma migration failed.');
  process.exit(1);
}

// ── Step 5: Generate Prisma client ────────────────────────────────────────────
log('⚙️   Step 5: Generating Prisma client...');
try {
  run('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  log('    ✅  Prisma client generated.\n');
} catch (e) {
  console.error('    ❌  Prisma generate failed.');
  process.exit(1);
}

log('');
log('🎉  Setup complete! You can now run:');
log('    npm run start:dev');
log('');
