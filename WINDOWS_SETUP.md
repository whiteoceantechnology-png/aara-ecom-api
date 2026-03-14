# 🪟 Windows Setup Guide — Aara E-Commerce API

> **For the frontend team.** Follow every step in order. This guide sets up the API on a fresh Windows machine.

---

## Step 1 — Install Prerequisites

Download and install these **in order**. Use default settings for each.

| Tool | Download Link | Important Note |
|------|--------------|----------------|
| **Node.js 18 LTS** | [nodejs.org](https://nodejs.org) | Click the **LTS** button |
| **PostgreSQL 17** | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) | **Write down** the password you set for the `postgres` user — you will need it |
| **Git** | [git-scm.com/download/win](https://git-scm.com/download/win) | Use all default settings |

> 💡 After installing, **close and reopen Command Prompt** so the new tools are available.

Verify the installs worked — open Command Prompt and run:

```cmd
node --version
npm --version
git --version
```

Each should print a version number. If they do, continue to Step 2.

---

## Step 2 — Clone the Project

Open **Command Prompt** and run:

```cmd
git clone <your-repo-url>
cd aara-ecom-api
npm install
```

> ⏳ `npm install` may take 1–2 minutes — wait for it to finish.

---

## Step 3 — Create Your `.env` File

In Command Prompt (inside the project folder), run:

```cmd
copy .env.example .env
```

Now open `.env` in **Notepad**:

```cmd
notepad .env
```

You will see this file. Update **these two lines** — replace `YOUR_POSTGRES_PASSWORD` with the password you set when installing PostgreSQL:

```env
DATABASE_URL="postgresql://admin:YOUR_POSTGRES_PASSWORD@localhost:5432/ecomdb"
POSTGRES_SUPERUSER_PASSWORD=YOUR_POSTGRES_PASSWORD
```

**Example** — if your PostgreSQL password is `mypassword123`:

```env
DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"
POSTGRES_SUPERUSER_PASSWORD=mypassword123
JWT_SECRET="change_me_to_a_long_random_secret"
PORT=3008
```

Save and close Notepad.

> ⚠️ **Special characters in your password?** If your password contains `@`, `#`, or `!`, you need to encode them **only in the `DATABASE_URL` line**:
>
> | Character | Replace with |
> |-----------|-------------|
> | `@` | `%40` |
> | `#` | `%23` |
> | `!` | `%21` |
> | `$` | `%24` |
>
> **Example:** Password `abc@123` → `DATABASE_URL` uses `abc%40123`, but `POSTGRES_SUPERUSER_PASSWORD` uses the original `abc@123`.

---

## Step 4 — Run Database Setup

This single command creates the database, user, and all tables automatically:

```cmd
npm run db:setup
```

You should see:

```
🔧  Database Setup
─────────────────────────────────────────────────
  Host          : localhost:5432
  Database      : ecomdb
  App User      : admin
  App Password  : (set)
  Superuser pwd : (set)
─────────────────────────────────────────────────

👤  Step 1: Creating PostgreSQL user...   ✅  User 'admin' created.
🗄️  Step 2: Creating database...          ✅  Database 'ecomdb' created.
🔑  Step 3: Granting privileges...        ✅  Privileges granted.
📦  Step 4: Running Prisma migrations...  ✅  Migrations applied.
⚙️  Step 5: Generating Prisma client...   ✅  Prisma client generated.

🎉  Setup complete!
```

---

## Step 5 — Start the API

```cmd
npm run start:dev
```

You should see:

```
🚀 Application is running on: http://localhost:3008
```

---

## Step 6 — Open the API Docs

Open your browser and go to:

**👉 http://localhost:3008/api/docs**

You will see the full interactive API documentation.

---

## ✅ Setup Complete!

Every time you want to use the API in the future, just open Command Prompt in the project folder and run:

```cmd
npm run start:dev
```

---

## ❗ Troubleshooting

### ❌ `password authentication failed`

The password in your `.env` is wrong.

**Fix:** Open `.env` in Notepad and make sure both lines use the **exact same password** you set during PostgreSQL installation:

```env
DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"
POSTGRES_SUPERUSER_PASSWORD=mypassword123
```

---

### ❌ `connect ECONNREFUSED` or `Cannot connect to PostgreSQL`

PostgreSQL is not running.

**Fix:**
1. Press **Win + S** → search **"Services"**
2. Find **postgresql-x64-17** (or similar)
3. Right-click → **Start**
4. Run `npm run db:setup` again

---

### ❌ `YOUR_POSTGRES_PASSWORD` error

You forgot to replace the placeholder in `.env`.

**Fix:** Open `.env` in Notepad and replace `YOUR_POSTGRES_PASSWORD` with your actual password.

---

### ❌ `Cannot find module '.prisma/client'`

The Prisma client wasn't generated.

**Fix:**

```cmd
npx prisma generate
```

---

### ❌ `npm install` fails or shows errors

**Fix:** Make sure you are inside the project folder:

```cmd
cd aara-ecom-api
npm install
```

---

### ❌ Node / npm / git not recognized after installing

You opened Command Prompt **before** installing the tools.

**Fix:** Close Command Prompt completely and open a **new** one.

---

## 📋 Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run db:setup` | First-time setup — creates DB, runs migrations |
| `npm run start:dev` | Start the API (use this every time) |
| `npm run db:migrate` | Apply new database changes (after a git pull) |
| `npm run db:reset` | ⚠️ Delete all data and start fresh |

---

## 📞 Need Help?

Share this information with the developer:

1. The exact error message you see
2. Which step failed (Step 1, 2, 3, etc.)
3. Your PostgreSQL version (run `psql --version` if available)
