# Aara API — New Server Prerequisites

Checklist of everything to install on a fresh (plain) Linux server before moving the Aara API to it.
This matches the project's current configuration: **MariaDB**, **PM2**, **port 3030**.

---

## 1. System packages

| Item | Why | Check command |
|---|---|---|
| Git | Clone the repo | `git --version` |
| curl, build tools (`build-essential`, `python3`, `make`, `g++`) | Native modules (`bcrypt`) compile during install | `gcc --version` |
| MariaDB server (10.6+ recommended) | Active database (`DATABASE_PROVIDER=mariadb`) | `mariadb --version` |
| Nginx or Apache (optional) | Reverse proxy to the API port / HTTPS | `nginx -v` |
| Certbot (optional) | SSL certificate | `certbot --version` |

Install on Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git curl build-essential python3 mariadb-server
```

---

## 2. Node.js and package manager

| Item | Version | Check command |
|---|---|---|
| Node.js | **20.19+ or 22.12+** (Prisma 7 requirement) — 22 LTS recommended | `node -v` |
| npm | Comes with Node | `npm -v` |
| pnpm | Lockfile is `pnpm-lock.yaml` — use pnpm to match it | `pnpm -v` |
| PM2 (global) | Runs the app in production (`ecosystem.config.cjs`) | `pm2 -v` |

```bash
# Node.js 22 LTS (example via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pnpm pm2
```

---

## 3. MariaDB setup

```bash
sudo mysql_secure_installation

sudo mariadb -e "CREATE DATABASE IF NOT EXISTS ecomdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mariadb -e "CREATE USER IF NOT EXISTS 'aara'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';"
sudo mariadb -e "GRANT ALL PRIVILEGES ON ecomdb.* TO 'aara'@'localhost'; FLUSH PRIVILEGES;"
```

Use the same database name, user and password in `DATABASE_URL` (see section 5).
The MariaDB migrations live in `prisma/migrations_mariadb/`. Do **not** run the PostgreSQL migrations (`prisma/migrations/`) on this server.

---

## 4. Project files to copy (not in git)

These files are **not** tracked in git, so copy them manually from the old server:

- `.env` (contains secrets — keep it private, `chmod 600 .env`)
- `uploads/` folder (product images and documents). The app reads it from `UPLOAD_DIR` (default `uploads`).
- Optional: `logs/` (PM2 writes here automatically)

---

## 5. Environment file (`.env`)

Start from `env.mariadb.example` and fill in real values:

```bash
cp env.mariadb.example .env
chmod 600 .env
```

Required variables:

| Variable | Value / note |
|---|---|
| `DATABASE_PROVIDER` | `mariadb` |
| `DATABASE_URL` | `mysql://aara:STRONG_PASSWORD@localhost:3306/ecomdb` (URL-encode special characters in the password) |
| `JWT_SECRET` | Long random string |
| `PORT` | `3008` in the example. PM2 currently forces `3030` (see section 8) |

Optional variables used by the code:

| Group | Variables |
|---|---|
| CORS / URLs | `CORS_ORIGIN`, `PUBLIC_API_BASE_URL`, `PAYMENT_LINK_BASE_URL` |
| Uploads | `UPLOAD_DIR` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` |
| WhatsApp | `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_FROM_NUMBER`, `WHATSAPP_OVERRIDE_RECIPIENT`, `WHATSAPP_ORDER_PLACED_TEMPLATE_ID`, `WHATSAPP_SHIPPED_TEMPLATE_ID`, `WHATSAPP_VISIT_WEBSITE` |
| Meta (Pixel / CAPI) | `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_CAPI_API_VERSION`, `META_CAPI_TEST_EVENT_CODE` |
| Checkout | `CHECKOUT_SHIPPING_FLAT` |
| Access control | `AUTHZ_ENFORCE` (leave unset or `false` first) |

---

## 6. Install and build the app

Run from the project folder:

```bash
pnpm install            # also runs prisma generate (postinstall)
pnpm run db:generate    # safe to re-run
pnpm run db:migrate     # applies prisma/migrations_mariadb/ (uses DATABASE_PROVIDER=mariadb)
pnpm run build          # creates dist/src/main.js (required by PM2)
```

Optional:

```bash
pnpm run db:seed        # seed sample data (only on a new, empty database)
```

Do not run `db:setup` or `db:reset` on the production database. Those are for setup and reset only.

---

## 7. Run with PM2

```bash
pnpm run pm2:start      # pm2 start ecosystem.config.cjs
pm2 save
pm2 startup             # follow the printed command to start PM2 on boot
pm2 logs aara-api
```

Logs go to `logs/pm2-out.log` and `logs/pm2-error.log`.

---

## 8. Port note

`ecosystem.config.cjs` sets `PORT: 3030`. This overrides `PORT` from `.env`.
Point your reverse proxy (Nginx) at **3030**, or change the value in `ecosystem.config.cjs`.
Never use 3306 (MariaDB) for the HTTP port.

---

## 9. Verification checklist

- [ ] `node -v` shows 20.19+ or 22.12+
- [ ] `mariadb --version` works and `ecomdb` exists
- [ ] `.env` is in the project root with `DATABASE_PROVIDER=mariadb`
- [ ] `uploads/` folder copied
- [ ] `pnpm run db:migrate` completes without errors
- [ ] `pnpm run build` completes without errors
- [ ] `pm2 status` shows `aara-api` as `online`
- [ ] `curl -i http://localhost:3030/` returns a response (any HTTP status shows the server is up)
- [ ] Reverse proxy and SSL point to the new server
- [ ] Test one login, one product list and one checkout flow

---

## 10. Migration cut-over (short)

1. Build and test on the new server while the old server still runs.
2. Stop writes on the old server, dump the database, and import it into the new MariaDB.
   `mariadb-dump -u aara -p ecomdb > ecomdb.sql` then `mariadb -u aara -p ecomdb < ecomdb.sql`
3. Copy `uploads/` (rsync is fine).
4. Update the DNS / proxy target to the new server.
5. Keep the old server running for a few days as a fallback.
