<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

**Aara API** — A NestJS REST API with **PostgreSQL** or **MariaDB** (via Prisma) for an e-commerce platform. Provides full authentication, user profile & address management, product catalogue (categories, products, variants, brands), cart, **checkout** (server-side pricing, coupons, idempotent place-order, inventory reservation), orders, payments, **product reviews** (verified purchase), customer management, and a complete **Admin panel** (dashboard, product/category/brand management, customer moderation, order management with CSV export).

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL or MariaDB (choose via `DATABASE_PROVIDER` + `DATABASE_URL`; see [Fresh install](#fresh-install-postgresql-or-mariadb))
- **ORM**: Prisma v7
- **Auth**: JWT + bcrypt
- **Docs**: Swagger UI (`/api/docs`)
- **Validation**: class-validator / class-transformer

---

## Getting Started

Choose your operating system below:

- 🪟 [Windows Setup (Frontend Team — Start Here)](#-windows-setup-frontend-team)
- 🍎 [macOS / Linux Setup](#-macos--linux-setup)

---

## 🪟 Windows Setup (Frontend Team)

> **You are here if:** You are on Windows and just received this project. Follow every step in order.

---

### Step 1 — Install Prerequisites

Install the following tools **once** on your Windows machine. Click each link and install with the default settings:

| Tool | Why you need it | Download |
|------|----------------|----------|
| **Node.js 18 LTS** | Runs the API | [nodejs.org](https://nodejs.org/) → click **LTS** |
| **PostgreSQL 15+** | The database | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) |
| **Git** | Download the project | [git-scm.com](https://git-scm.com/download/win) |

> ⚠️ **Important — PostgreSQL install:** During the PostgreSQL installer, you will be asked to set a **password for the `postgres` user**. Write this password down — you will need it in Step 3.
>
> 💡 After installing, open a new **Command Prompt** (search for `cmd` in Start Menu) so the new tools are available.

---

### Step 2 — Clone the Project

Open **Command Prompt** and run:

```cmd
git clone <your-repo-url>
cd aara-ecom-api
npm install
```

---

### Step 3 — Create Your `.env` File

In the project folder, copy `.env.example` to a new file named `.env`:

```cmd
copy .env.example .env
```

Now open `.env` in Notepad (or any text editor) and update **two lines** — replacing `YOUR_POSTGRES_PASSWORD` with the password you set when installing PostgreSQL:

```env
DATABASE_URL="postgresql://admin:YOUR_POSTGRES_PASSWORD@localhost:5432/ecomdb"
POSTGRES_SUPERUSER_PASSWORD=YOUR_POSTGRES_PASSWORD
```

**Example:** If your PostgreSQL password is `mypassword123`:
```env
DATABASE_URL="postgresql://admin:mypassword123@localhost:5432/ecomdb"
POSTGRES_SUPERUSER_PASSWORD=mypassword123
```

> ⚠️ If your password contains special characters like `@`, `#`, or `!`, replace them **only in the DATABASE_URL line**:
> - `@` → `%40`
> - `#` → `%23`
> - `!` → `%21`
>
> **Example:** Password `abc@123` → `DATABASE_URL` uses `abc%40123`, but `POSTGRES_SUPERUSER_PASSWORD` uses the original `abc@123`.

Leave the other lines in `.env` as they are.

---

### Step 4 — Run Database Setup

This single command will:
- ✅ Create the database user automatically
- ✅ Create the `ecomdb` database automatically
- ✅ Set up all the database tables
- ✅ Prepare everything the API needs

```cmd
npm run db:setup
```

> ❗ **Troubleshooting:** If you see `psql is not recognized`, PostgreSQL's `bin` folder is not in your PATH.
> Fix it:
> 1. Open **Start Menu** → search `Environment Variables` → click **Edit the system environment variables**
> 2. Click **Environment Variables** → under **System variables** find `Path` → click **Edit**
> 3. Click **New** → add: `C:\Program Files\PostgreSQL\15\bin` (use your actual version number)
> 4. Click OK, close Command Prompt, open a new one, and re-run `npm run db:setup`

---

### Step 5 — Start the API

```cmd
npm run start:dev
```

You should see: `🚀 Application running on: http://localhost:3008`

---

### Step 6 — Open the API Docs

Open your browser and go to:

**http://localhost:3008/api/docs**

You will see the full API documentation where you can test every endpoint.

---

### ✅ Windows Setup Complete!

Every time you want to use the API, just open Command Prompt in the project folder and run:
```cmd
npm run start:dev
```

---

## 🍎 macOS / Linux Setup

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) running locally
- npm

---

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd aara-ecom-api
npm install
```

### 2. Configure Environment Variables

Copy the example that matches the database you will use:

| Database    | Copy this file           |
|-------------|--------------------------|
| PostgreSQL  | `cp env.postgres.example .env` |
| MariaDB     | `cp env.mariadb.example .env`  |

You can also start from `.env.example` (see `DATABASE_PROVIDER` there). Edit `.env` and set **`DATABASE_URL`** (and **`JWT_SECRET`**, **`PORT`** as needed).

> ⚠️ If your password contains special characters like `@`, URL-encode them in `DATABASE_URL`.
> For example, `abc@123` becomes `abc%40123`.

---

### Fresh install: PostgreSQL or MariaDB

Prisma uses **`prisma/schema.prisma`** + **`prisma/migrations/`** for PostgreSQL, and **`prisma/schema.mariadb.prisma`** + **`prisma/migrations_mariadb/`** for MariaDB. The active schema is chosen from **`DATABASE_PROVIDER`** and your URL (see `prisma/prisma.config.ts`).

**Always run `npm run db:generate` after changing `.env`** so the generated client matches your database.

#### PostgreSQL (fresh)

1. Install and start PostgreSQL locally; create nothing manually if you will use the helper below.
2. In `.env`: **`DATABASE_PROVIDER=postgres`** (or omit it if `DATABASE_URL` starts with `postgresql://`).
3. Set `DATABASE_URL`, e.g.  
   `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ecomdb"`
4. From the project root:

```bash
npm install
npm run db:setup
```

`db:setup` creates the user/database (when possible), applies migrations from **`prisma/migrations/`**, and runs **`db:generate`**.

If you prefer to apply migrations only (database already exists):

```bash
npm install
npm run db:generate
npm run db:migrate
```

Optional seed:

```bash
npm run db:seed
```

#### MariaDB (fresh)

1. Install and start **MariaDB** (or MySQL). Create an empty database, e.g.  
   `CREATE DATABASE IF NOT EXISTS ecomdb;`
2. In `.env`: **`DATABASE_PROVIDER=mariadb`** and a Node-style URL (not JDBC), e.g.  
   `DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/ecomdb"`  
   (`mariadb://` is also supported.)
3. From the project root:

```bash
npm install
npm run db:generate
npx prisma migrate dev --config=prisma/prisma.config.ts --name init
```

That creates and applies the first migration under **`prisma/migrations_mariadb/`**. Do **not** run the PostgreSQL SQL migrations on MariaDB.

Optional seed:

```bash
npm run db:seed
```

**Switching engines later:** Change `.env`, then run **`npm run db:generate`** again (and use the correct migration folder for `db:migrate`).

---

### 3. Database Setup (PostgreSQL — automated helper)

On macOS/Linux/Windows you can use the all-in-one script (PostgreSQL **only**):

```bash
npm run db:setup
```

This uses `scripts/db-setup.js` with **`pg`**: it creates user/DB when possible, runs **`prisma/migrations/`**, and **`db:generate`**. For MariaDB, use the [MariaDB (fresh)](#mariadb-fresh) steps instead.

### 4. Generate Prisma Client (if needed)

```bash
npm run db:generate
```

If you see a missing Prisma client error, ensure `.env` is set and run the command above (it uses `prisma/prisma.config.ts`).

### 5. Run the Application

```bash
# development (watch mode — recommended)
npm run start:dev

# standard mode
npm run start

# production mode
npm run start:prod
```

The API will be available at: **http://localhost:3008**
Swagger docs at: **http://localhost:3008/api/docs**

---

## 🔐 Authentication

All API routes are **protected by JWT authentication** by default. You must include a valid token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### How to get a token

1. **User token** — `POST /auth/login` → returns `{ "token": "eyJ..." }`
2. **Admin token** — `POST /admin/auth/login` → returns `{ "token": "eyJ...", "admin": {...} }`
3. **Customer token** — `POST /customers/login` → returns `{ "token": "eyJ..." }`

### Public routes (no token needed)

The following routes are accessible **without** a token:

| Route | Description |
|---|---|
| `GET /` | Health check |
| `POST /auth/register` | User registration |
| `POST /auth/login` | User login |
| `POST /auth/forgot-password` | Request password reset |
| `POST /auth/reset-password` | Reset password |
| `POST /admin/auth/register` | Admin registration |
| `POST /admin/auth/login` | Admin login |
| `POST /customers/register` | Customer registration |
| `POST /customers/login` | Customer login |
| `GET /categories` | List categories |
| `GET /categories/:id` | Category detail |
| `GET /categories/:id/products` | Products by category |
| `GET /products` | List products |
| `GET /products/:id` | Product detail |
| `GET /products/:id/reviews` | Product reviews + rating aggregate |
| `GET /products/:id/variants` | Variants for a product |
| `POST /product/variant` | Product variant lookup |
| `GET /product/specification/:id` | Product specification (read by product ID) |
| `POST /product/specification/:id` | Create/update product specification (auth) |

> All other routes return `401 Unauthorized` without a valid token.

### Swagger

In Swagger UI (`/api/docs`), click the **🔒 Authorize** button at the top, paste your token, and all protected endpoints will include it automatically.

---

## 🔄 Pulling Latest Changes (For Developers)

When another developer pushes changes (new features, schema updates, etc.), run:

```bash
git pull
npm install
npm run db:migrate
npm run db:generate
npm run start:dev
```

Your **`DATABASE_PROVIDER`** and **`DATABASE_URL`** in `.env` must match the database you use (PostgreSQL vs MariaDB). After `git pull`, if migrations failed, confirm you are on the right engine and run **`npm run db:generate`** so the Prisma client matches `.env`.

---

## API Endpoints

> 🔓 = Public (no token) | 🔒 = Protected (requires `Authorization: Bearer <token>`)

### 🔐 Auth

| Method   | Endpoint                  | Auth | Description                          |
|----------|---------------------------|------|--------------------------------------|
| `POST`   | `/auth/register`          | 🔓   | Register a new user (with optional profile) |
| `POST`   | `/auth/login`             | 🔓   | Login and receive a JWT token        |
| `PATCH`  | `/auth/update/:id`        | 🔒   | Update username or password          |
| `POST`   | `/auth/forgot-password`   | 🔓   | Request a password reset token       |
| `POST`   | `/auth/reset-password`    | 🔓   | Reset password using the reset token |

### 👤 User

| Method   | Endpoint                          | Auth | Description                    |
|----------|-----------------------------------|------|--------------------------------|
| `GET`    | `/user/:id/details`               | 🔒   | Get user profile details       |
| `GET`    | `/user/:id/address`               | 🔒   | Get all addresses for a user   |
| `POST`   | `/user/:id/address`               | 🔒   | Add a new address              |
| `PATCH`  | `/user/:id/address/:addressId`    | 🔒   | Edit an existing address       |
| `DELETE` | `/user/:id/address/:addressId`    | 🔒   | Remove an address              |

---

### Example: Register (with profile)
```bash
curl -X POST http://localhost:3008/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "Secret@123",
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john@gmail.com",
    "birthDate": "10-10-2000"
  }'
```

**Response `201`:**
```json
{
  "id": 1,
  "username": "john_doe",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john@gmail.com",
    "birthDate": "10-10-2000"
  }
}
```

### Example: Login
```bash
curl -X POST http://localhost:3008/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "john_doe", "password": "Secret@123" }'
```

### Example: Get User Profile
```bash
curl http://localhost:3008/user/1/details \
  -H "Authorization: Bearer <your-token>"
```

**Response `200`:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@gmail.com",
  "birthDate": "10-10-2000"
}
```

### Example: Get User Addresses
```bash
curl http://localhost:3008/user/1/address \
  -H "Authorization: Bearer <your-token>"
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "houseNo": "22/34",
    "areaStreet": "Nehru Street",
    "city": "Erode",
    "state": "Tamil Nadu",
    "pincode": "638105",
    "country": "India",
    "default": "yes"
  }
]
```

### Example: Add Address
```bash
curl -X POST http://localhost:3008/user/1/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "houseNo": "22/34",
    "areaStreet": "Nehru Street",
    "city": "Erode",
    "state": "Tamil Nadu",
    "pincode": "638105",
    "country": "India",
    "isDefault": true
  }'
```

### Example: Edit Address
```bash
curl -X PATCH http://localhost:3008/user/1/address/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "city": "Coimbatore", "pincode": "641001" }'
```

### Example: Remove Address
```bash
curl -X DELETE http://localhost:3008/user/1/address/1 \
  -H "Authorization: Bearer <your-token>"
```

---

## API Endpoints — E-Commerce

### 🗂️ Categories

| Method   | Endpoint                    | Auth | Description                    |
|----------|-----------------------------|------|--------------------------------|
| `GET`    | `/categories`               | 🔓   | Get all categories             |
| `GET`    | `/categories/:id`           | 🔓   | Get category by ID             |
| `GET`    | `/categories/:id/products`  | 🔓   | Get products by category       |
| `POST`   | `/categories`               | 🔒   | Create a category              |
| `PUT`    | `/categories/:id`           | 🔒   | Update a category              |
| `DELETE` | `/categories/:id`           | 🔒   | Delete a category              |

**Create body (`POST /categories`)** — send JSON only:

```json
{ "name": "Raw Dried Herbs", "categoryImage": "/images/category/sample.png" }
```

`categoryImage` is optional. Categories are identified by numeric **`id`** in URLs and relations — there is **no category slug** column.

**Update (`PUT /categories/:id`)** — send any subset of:

```json
{ "name": "Dried Herbs", "categoryImage": "/images/category/updated.png" }
```

Both fields are optional; include only what you want to change. There is **no `slug`** field on categories.

**Admin (`POST /admin/categories`)** uses the same create body: **`name`** + optional **`categoryImage`**.

**Admin update (`PUT /admin/categories/:id`)** — optional **`name`**, **`categoryImage`**, and **`isActive`** (same as storefront update, plus visibility for the catalogue).

### 💹 Tax

| Method   | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| `GET`    | `/taxes` | 🔓   | List tax rates `{ id, name, percent }` |
| `POST`   | `/taxes` | 🔒   | Body `{ "name": "GST 5%", "percent": 5 }` — create a rate |

**Create tax:** `POST /taxes` with a valid Bearer token (same JWT guard as other protected routes).

```json
{ "name": "GST 5%", "percent": 5 }
```

**Products:** optional **`taxId`** on `POST/PUT /products` (and admin product APIs). Use the **`id`** from **`GET /taxes`**. When **`taxId`** is set, the product’s stored **`taxPercent`** is copied from that tax row (master data). Responses include **`tax`: `{ id, name, percent }`** when linked, else **`tax: null`**.

Open **Swagger** at `/api/docs` — the global description summarizes category fields and tax linking.

### 📦 Products

| Method   | Endpoint                       | Auth | Description                          |
|----------|--------------------------------|------|--------------------------------------|
| `GET`    | `/products`                    | 🔓   | Get all products                     |
| `GET`    | `/products?category=1`         | 🔓   | Filter products by category ID       |
| `GET`    | `/products?search=ashwagandha` | 🔓   | Search products by name              |
| `GET`    | `/products?specKey=Fabric&specValue=Cotton` | 🔓 | Filter by spec (Amazon-style) |
| `GET`    | `/products/:id`                | 🔓   | Get product by ID (includes variants)|
| `GET`    | `/products/:id/reviews`       | 🔓   | Reviews list + `avgRating` / `totalReviews` |
| `GET`    | `/products/:id/variants`       | 🔓   | Get all variants for a product       |
| `POST`   | `/products`                    | 🔒   | Create a product                     |
| `PUT`    | `/products/:id`                | 🔒   | Update a product                     |
| `DELETE` | `/products/:id`                | 🔒   | Delete a product                     |

### 🔎 Product Lookup (Frontend APIs)

| Method   | Endpoint                  | Auth | Description                                    |
|----------|---------------------------|------|------------------------------------------------|
| `POST`   | `/product/variant`              | 🔓   | Get variants with images, colors, stock, price |
| `GET`    | `/product/specification/:id`    | 🔓   | Get specification JSON + description (`longDescription` / `productDescription`, `moreInfoHtml` / `moreInfo`, `categoryName`) |
| `POST`   | `/product/specification/:id`    | 🔒   | Create/update specification (same body as admin `PUT /admin/products/:id/specification`) |

### 🔢 Variants

| Method   | Endpoint          | Auth | Description             |
|----------|-------------------|------|-------------------------|
| `POST`   | `/variants`       | 🔒   | Create a product variant |
| `PUT`    | `/variants/:id`   | 🔒   | Update a variant        |
| `DELETE` | `/variants/:id`   | 🔒   | Delete a variant        |

### 🧑 Customers

| Method   | Endpoint                  | Auth | Description              |
|----------|---------------------------|------|--------------------------|
| `POST`   | `/customers/register`     | 🔓   | Register a new customer  |
| `POST`   | `/customers/login`        | 🔓   | Customer login (JWT)     |
| `GET`    | `/customers/:id`          | 🔒   | Get customer by ID       |

### ❤️ Wishlist (customer JWT)

`customerId` comes from the token only—**no** `customerId` in the body.

| Method   | Endpoint                 | Auth | Description |
|----------|--------------------------|------|-------------|
| `POST`   | `/wishlist`              | 🔒   | Body `{ "productId": 7 }` → `{ message: "Product added to wishlist" }` or *already in wishlist* |
| `GET`    | `/wishlist?page=1&limit=10` | 🔒 | Paginated list: `productId`, `name`, `price`, `image` |
| `DELETE` | `/wishlist/:productId`   | 🔒   | Remove item |

### 🛒 Cart

| Method   | Endpoint                        | Auth | Description                    |
|----------|---------------------------------|------|--------------------------------|
| `GET`    | `/cart/:customerId`             | 🔒   | Get cart for a customer        |
| `POST`   | `/cart/add`                     | 🔒   | Add item to cart               |
| `PUT`    | `/cart/update`                  | 🔒   | Update cart item quantity      |
| `DELETE` | `/cart/remove/:cartItemId`      | 🔒   | Remove item from cart          |

### 🧾 Checkout (customer JWT)

Uses the same **customer** token as `/customers/login` (`payload.customerId`). Prices are **always recomputed** on the server from live variant prices (cart line prices are not trusted).

| Method   | Endpoint                    | Auth | Description |
|----------|-----------------------------|------|-------------|
| `GET`    | `/checkout/summary`         | 🔒   | Subtotal, discount, tax, shipping, total; optional session coupon |
| `POST`   | `/checkout/apply-coupon`    | 🔒   | Store coupon on checkout session (24h TTL) |
| `POST`   | `/checkout/place-order`     | 🔒   | Create order; optional header `Idempotency-Key` for safe retries |

**Place-order body:** `addressId?`, `paymentMethod` (`CARD` \| `UPI` \| `NETBANKING` \| `COD`), `couponCode?`.  
**Non-COD:** stock is **reserved** until payment succeeds (Razorpay verify or `POST /payments`). **COD:** stock is reduced immediately.

**Env:** `CHECKOUT_SHIPPING_FLAT` (optional; default `50`).

### 📋 Orders

| Method   | Endpoint                  | Auth | Description                          |
|----------|---------------------------|------|--------------------------------------|
| `POST`   | `/orders`                 | 🔒   | Legacy create from cart — **`customerId` in body must match JWT** |
| `GET`    | `/orders`                 | 🔒   | List orders for the **authenticated customer** only |
| `GET`    | `/orders/:id`             | 🔒   | Order detail — only if it belongs to the customer |
| `POST`   | `/orders/:id/cancel`      | 🔒   | Cancel while `PENDING_PAYMENT` (releases reservation) |
| `PUT`    | `/orders/:id/status`      | 🔒   | Update order status                  |

### ⭐ Reviews (customer JWT for write; public read on product)

| Method   | Endpoint              | Auth | Description |
|----------|-----------------------|------|-------------|
| `POST`   | `/reviews`            | 🔒   | Create review — requires `orderId`; order must be **DELIVERED** and contain the product |
| `DELETE` | `/reviews/:id`        | 🔒   | Delete own review |
| `GET`    | `/products/:id/reviews` | 🔓 | List reviews + aggregates (see Products) |

### 💳 Payments

| Method   | Endpoint                        | Auth | Description                    |
|----------|---------------------------------|------|--------------------------------|
| `POST`   | `/payments`                     | 🔒   | Record payment — marks order paid and **commits** reserved stock (online orders) |
| `POST`   | `/payments/razorpay/create-order` | 🔒 | Create Razorpay order for checkout |
| `POST`   | `/payments/razorpay/verify`     | 🔒   | Verify Razorpay payment signature |
| `GET`    | `/payments/razorpay/status`     | 🔒   | Check if Razorpay is configured |
| `GET`    | `/payments/order/:orderId`      | 🔒   | Get all payments for an order  |
| `GET`    | `/payments/:id`                 | 🔒   | Get payment by ID              |

---

### Example: Get All Products
```bash
curl http://localhost:3008/products
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Ashwagandha Root",
    "hsnCode": "12119029",
    "taxPercent": "5",
    "category": { "id": 1, "name": "Raw Dried Herbs" },
    "variants": [
      { "id": 1, "sku": "ASH-25", "price": "31", "packSize": { "label": "25 g" } },
      { "id": 2, "sku": "ASH-50", "price": "52", "packSize": { "label": "50 g" } },
      { "id": 3, "sku": "ASH-100", "price": "94", "packSize": { "label": "100 g" } }
    ]
  }
]
```

### Example: Filter by Category
```bash
curl "http://localhost:3008/products?category=1"
```

### Example: Search Products
```bash
curl "http://localhost:3008/products?search=ashwagandha"
```

### Example: Filter by Spec (Amazon-style)
```bash
curl "http://localhost:3008/products?specKey=Fabric&specValue=Cotton"
```

### Example: Upsert Product Specification (Admin)
```bash
curl -X PUT http://localhost:3008/admin/products/7/specification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "specification": [
      {
        "title": "Product Details",
        "items": [
          { "key": "Fabric", "value": "Cotton" },
          { "key": "Fit", "value": "Regular" }
        ]
      }
    ],
    "description": {
      "shortDescription": "Brief product summary",
      "longDescription": "Full product description with details",
      "moreInfoHtml": "<ul><li>Feature 1</li><li>Feature 2</li></ul>"
    }
  }'
```

### Example: Register Customer
```bash
curl -X POST http://localhost:3008/customers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@gmail.com",
    "phone": "9876543210",
    "password": "Secret@123"
  }'
```

### Example: Add to Cart
```bash
curl -X POST http://localhost:3008/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "customerId": 1, "variantId": 1, "quantity": 2 }'
```

### Example: Checkout summary (customer token)
```bash
curl http://localhost:3008/checkout/summary \
  -H "Authorization: Bearer <customer-jwt>"
```

### Example: Place order (recommended)
```bash
curl -X POST http://localhost:3008/checkout/place-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer-jwt>" \
  -H "Idempotency-Key: checkout-attempt-001" \
  -d '{ "addressId": 1, "paymentMethod": "CARD", "couponCode": "SAVE10" }'
```

### Example: Create Order (legacy — customer JWT; `customerId` must match token)
```bash
curl -X POST http://localhost:3008/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer-jwt>" \
  -d '{ "customerId": 1, "cartId": 1 }'
```

**Typical `201` body (online checkout — unpaid, stock reserved):**
```json
{
  "id": 1,
  "orderNumber": "ORD-abc123def4567890",
  "status": "PENDING_PAYMENT",
  "totalAmount": "130",
  "paymentStatus": "pending",
  "items": []
}
```

### Example: Razorpay Payment Flow
**1. Create Razorpay order** (after order is created):
```bash
curl -X POST http://localhost:3008/payments/razorpay/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "orderId": 1 }'
```
**Response:** `{ "razorpayOrderId": "order_xxx", "amount": 10000, "currency": "INR", "keyId": "rzp_test_xxx" }`

**2. Frontend:** Use [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/) with `razorpayOrderId` and `keyId`.

**3. Verify payment** (after checkout success):
```bash
curl -X POST http://localhost:3008/payments/razorpay/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "orderId": 1,
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_from_checkout"
  }'
```

**Verify response:** `{ "success": true, "payment": { "id": 1, "orderId": 1, "paymentMethod": "razorpay", ... } }` — order moves to **`PROCESSING`** with **`paymentStatus: paid`** and reserved stock is **committed**.

### Example: Product reviews (public)
```bash
curl http://localhost:3008/products/1/reviews
```

### Example: Create Payment
```bash
curl -X POST http://localhost:3008/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "orderId": 1, "paymentMethod": "UPI", "transactionId": "TXN123456" }'
```

**Response `201`:**
```json
{
  "id": 1,
  "orderId": 1,
  "paymentMethod": "UPI",
  "transactionId": "TXN123456",
  "paymentStatus": "paid",
  "paymentDate": "2026-03-11T14:30:00.000Z"
}
```

### Example: Get Payments for an Order
```bash
curl http://localhost:3008/payments/order/1 \
  -H "Authorization: Bearer <your-token>"
```

### Example: Update Order Status
```bash
curl -X PUT http://localhost:3008/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "status": "shipped" }'
```

---

## Admin API Endpoints

> All admin routes are prefixed with `/admin`.
> All admin routes (except auth) require a valid JWT token: `Authorization: Bearer <token>`
>
> **Architecture note:** Admin controllers do **not** duplicate domain services. Instead, each domain service (`CategoriesService`, `OrdersService`, `ProductsService`) is extended with `admin*`-prefixed methods. The `AdminModule` imports the domain modules to access their exported services — single source of truth per domain.

### 🔐 Admin Auth

| Method | Endpoint              | Auth | Description                      |
|--------|-----------------------|------|----------------------------------|
| `POST` | `/admin/auth/register`| 🔓   | Register admin account           |
| `POST` | `/admin/auth/login`   | 🔓   | Login — returns 8h JWT token     |

### 📊 Admin Dashboard

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| `GET`  | `/admin/dashboard`              | 🔒   | Summary: orders, revenue, customers, top products, orders by status |
| `GET`  | `/admin/dashboard/sales?days=30`| 🔒   | Daily sales report for the past N days   |

### 🗂️ Admin Categories

| Method   | Endpoint                   | Auth | Description                                  |
|----------|----------------------------|------|----------------------------------------------|
| `GET`    | `/admin/categories`        | 🔒   | All categories with parent/child & product count |
| `GET`    | `/admin/categories/:id`    | 🔒   | Category detail with products                |
| `POST`   | `/admin/categories`        | 🔒   | Create category (`name` + optional image) |
| `PUT`    | `/admin/categories/:id`    | 🔒   | Edit name, image, `isActive`   |
| `DELETE` | `/admin/categories/:id`    | 🔒   | Delete category                              |

### 🏷️ Admin Brands

| Method   | Endpoint              | Auth | Description        |
|----------|-----------------------|------|--------------------|
| `GET`    | `/admin/brands`       | 🔒   | List all brands    |
| `POST`   | `/admin/brands`       | 🔒   | Create a brand     |
| `PUT`    | `/admin/brands/:id`   | 🔒   | Update a brand     |
| `DELETE` | `/admin/brands/:id`   | 🔒   | Delete a brand     |

### 📦 Admin Products

| Method   | Endpoint                          | Auth | Description                                    |
|----------|-----------------------------------|------|------------------------------------------------|
| `GET`    | `/admin/products`                 | 🔒   | List products (`?search=`, `?categoryId=`, `?brandId=`, `?specKey=`, `?specValue=`) |
| `GET`    | `/admin/products/:id`             | 🔒   | Product detail (variants, images, brand, specifications, specItems) |
| `POST`   | `/admin/products`                 | 🔒   | Create product                                 |
| `PUT`    | `/admin/products/:id`             | 🔒   | Edit product (name, description, tax, status)  |
| `DELETE` | `/admin/products/:id`             | 🔒   | Delete product                                 |
| `PUT`    | `/admin/products/:id/specification` | 🔒 | Create/update specification (JSON + flat table for filtering) |
| `DELETE` | `/admin/products/:id/specification` | 🔒 | Delete product specification                  |
| `PUT`    | `/admin/variants/:id/stock`       | 🔒   | Update variant stock quantity                  |
| `POST`   | `/admin/products/:id/images`      | 🔒   | Add image to product (set isPrimary)           |
| `DELETE` | `/admin/images/:id`               | 🔒   | Delete a product image                         |

### 🖼️ Admin Images (Upload & Serve)

| Method   | Endpoint                   | Auth | Description                                              |
|----------|----------------------------|------|----------------------------------------------------------|
| `POST`   | `/admin/images/upload`     | 🔒   | Upload 1–20 images (multipart, field `files`)           |
| `GET`    | `/admin/images/serve?path=`| 🔒   | Serve image by path (from upload response)               |

- **Upload**: Use form field `files` for single or multiple images. Max 5MB per file. Allowed: JPEG, PNG, GIF, WebP, SVG.
- **Response paths**: Use returned `path` in category/product/variant `categoryImage` or `imageUrl`. Frontend receives ready-to-use URLs in list responses.

**Example: Upload images**
```bash
curl -X POST http://localhost:3008/admin/images/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.png"
```
**Response `201`:**
```json
[
  { "id": 1, "path": "2026/03/20/1773990762403-abc12345.jpg", "originalName": "photo1.jpg", "mimeType": "image/jpeg", "size": 1024, "createdAt": "2026-03-20T..." },
  { "id": 2, "path": "2026/03/20/1773990762404-def67890.png", "originalName": "photo2.png", "mimeType": "image/png", "size": 2048, "createdAt": "2026-03-20T..." }
]
```

### 👥 Admin Customers

| Method  | Endpoint                          | Auth | Description                                       |
|---------|-----------------------------------|------|---------------------------------------------------|
| `GET`   | `/admin/customers`                | 🔒   | Customer list (`?search=`, `?isBlocked=true/false`) |
| `GET`   | `/admin/customers/:id`            | 🔒   | Detail view: order history, total spent, last order date |
| `PATCH` | `/admin/customers/:id/toggle-block` | 🔒 | Block / unblock customer account               |

### 📋 Admin Orders

| Method | Endpoint                  | Auth | Description                                              |
|--------|---------------------------|------|----------------------------------------------------------|
| `GET`  | `/admin/orders`           | 🔒   | All orders (`?status=`, `?paymentStatus=`, `?search=`, `?from=`, `?to=`) |
| `GET`  | `/admin/orders/:id`       | 🔒   | Full order detail (items, payments, shipments)           |
| `PUT`  | `/admin/orders/:id`       | 🔒   | Update order — status, tracking ID, notes                |
| `GET`  | `/admin/orders/export`    | 🔒   | Export orders to CSV (`?status=`, `?from=`, `?to=`)      |

### Example: Admin Login
```bash
curl -X POST http://localhost:3008/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "admin", "password": "Admin@123" }'
```
**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": { "id": 1, "username": "admin", "role": "admin" }
}
```

### Example: Dashboard Summary
```bash
curl http://localhost:3008/admin/dashboard \
  -H "Authorization: Bearer <admin-token>"
```
**Response `200`:**
```json
{
  "summary": {
    "totalOrders": 42,
    "totalCustomers": 18,
    "totalProducts": 12,
    "pendingOrders": 5,
    "totalRevenue": "4826.50"
  },
  "ordersByStatus": [
    { "status": "pending", "count": 5 },
    { "status": "shipped", "count": 15 }
  ],
  "recentOrders": [...],
  "topProducts": [...]
}
```

### Example: Export Orders to CSV
```bash
curl "http://localhost:3008/admin/orders/export?status=shipped&from=2026-01-01" \
  -H "Authorization: Bearer <admin-token>" \
  -o orders.csv
```

### Example: Update Order (status + tracking)
```bash
curl -X PUT http://localhost:3008/admin/orders/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "status": "shipped", "trackingId": "TRK-987654321", "notes": "Express delivery" }'
```

### Example: Block a Customer
```bash
curl -X PATCH http://localhost:3008/admin/customers/1/toggle-block \
  -H "Authorization: Bearer <admin-token>"
```
**Response `200`:**
```json
{ "id": 1, "name": "John Doe", "email": "john@gmail.com", "isBlocked": true, "message": "Customer blocked" }
```

### Example: Update Stock
```bash
curl -X PUT http://localhost:3008/admin/variants/1/stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "stockQuantity": 150 }'
```

---

## Database Scripts

| Command              | Description                                              |
|----------------------|----------------------------------------------------------|
| `npm run db:setup`   | **PostgreSQL only** — create user/DB when possible, migrate, generate |
| `npm run db:migrate` | Apply pending migrations (`prisma/migrations/` or `migrations_mariadb/` per `prisma.config.ts`) |
| `npm run db:generate`| Regenerate Prisma client (must match `DATABASE_PROVIDER` / URL in `.env`) |
| `npm run db:seed`    | Seed pack sizes + default admin (uses `.env`)            |
| `npm run db:reset`   | ⚠️ Drop and recreate DB (deletes all data)               |

**MariaDB fresh:** use `npm run db:generate` then `npx prisma migrate dev --config=prisma/prisma.config.ts --name <name>` (see [Fresh install](#fresh-install-postgresql-or-mariadb)).

---

## Run Tests

```bash
# unit tests
$ npm run test

# unit tests for auth module only
$ npm test -- --testPathPatterns="src/auth" --forceExit

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

### Test Coverage

| Spec File | What's covered |
|-----------|----------------|
| `product/checkout/checkout.controller.spec.ts` | Checkout summary, apply-coupon, place-order, idempotency header |
| `product/checkout/checkout-pricing.util.spec.ts` | Server-side totals, discounts, tax, `toCartLineInputs` |
| `product/reviews/reviews.controller.spec.ts` | Create / delete review |
| `product/orders/orders.controller.spec.ts` | Orders + cancel + customer JWT checks |
| `product/payments/payments.service.spec.ts` | Payment create + inventory commit via `OrdersService` |
| `product/products/products.controller.spec.ts` | Products CRUD + **`getReviews`** (`/products/:id/reviews`) |
| *(plus existing suites under `auth/`, `admin/`, `common/`, …)* | — |

Run **`npm test`** for the full suite (for example **32** suites / **313** tests after checkout & reviews coverage). Use **`npm run test:cov`** for coverage reports.

---

## Project Structure

```
src/
├── auth/
│   ├── dto/
│   │   ├── register.dto.ts         ← Input validation (includes optional profile fields)
│   │   ├── login.dto.ts
│   │   ├── update-user.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   └── auth-response.dto.ts    ← Response types
│   ├── auth.controller.ts          ← HTTP layer + Swagger
│   ├── auth.controller.spec.ts     ← Controller unit tests (5 tests)
│   ├── auth.service.ts             ← Business logic
│   ├── auth.service.spec.ts        ← Service unit tests (16 tests)
│   ├── auth.module.ts              ← NestJS module
│   ├── jwt-auth.guard.ts           ← Global JWT guard (verifies Bearer token)
│   ├── public.decorator.ts         ← @Public() decorator to skip auth
│   ├── user.repository.ts          ← Data access layer
│   └── user.repository.spec.ts     ← Repository unit tests (10 tests)
├── user/
│   ├── dto/
│   │   └── user.dto.ts             ← Profile & address DTOs
│   ├── user.controller.ts          ← /user endpoints + Swagger
│   ├── user.service.ts             ← Business logic
│   ├── user.repository.ts          ← Prisma queries for profile & address
│   └── user.module.ts              ← NestJS module
├── product/
│   ├── dto/
│   │   ├── category.dto.ts         ← Category create/update DTOs
│   │   ├── product.dto.ts          ← Product create/update/filter DTOs
│   │   ├── product-lookup.dto.ts   ← Product ID DTO for variant/spec lookup
│   │   ├── variant.dto.ts          ← Variant create/update DTOs
│   │   ├── customer.dto.ts         ← Customer register/login DTOs
│   │   ├── cart.dto.ts             ← Cart add/update/remove DTOs
│   │   ├── checkout.dto.ts         ← Checkout apply-coupon / place-order
│   │   ├── review.dto.ts           ← Product reviews
│   │   └── order.dto.ts            ← Order/payment DTOs
│   ├── decorators/
│   │   └── current-customer.decorator.ts  ← @CurrentCustomerId() (customer JWT)
│   ├── checkout/
│   │   ├── checkout.controller.ts / .spec.ts
│   │   ├── checkout.service.ts
│   │   ├── checkout-pricing.util.ts / .spec.ts
│   │   └── checkout.module.ts
│   ├── reviews/
│   │   ├── reviews.controller.ts / .spec.ts
│   │   ├── reviews.service.ts
│   │   └── reviews.module.ts
│   ├── product-lookup.controller.ts ← POST /product/variant; GET/POST /product/specification/:id
│   ├── categories/
│   │   ├── categories.controller.ts       ← /categories endpoints + Swagger
│   │   ├── categories.controller.spec.ts  ← Unit tests (7 tests)
│   │   ├── categories.service.ts          ← Business logic (public + admin methods)
│   │   └── categories.module.ts
│   ├── products/
│   │   ├── products.controller.ts         ← /products endpoints + Swagger
│   │   ├── products.controller.spec.ts    ← Unit tests (incl. getReviews)
│   │   ├── products.service.ts            ← Business logic (public + admin methods with brand/image support)
│   │   └── products.module.ts
│   ├── variants/
│   │   ├── variants.controller.ts         ← /variants endpoints + Swagger
│   │   ├── variants.controller.spec.ts    ← Unit tests (5 tests)
│   │   ├── variants.service.ts            ← Business logic
│   │   └── variants.module.ts
│   ├── customers/
│   │   ├── customers.controller.ts        ← /customers endpoints + Swagger
│   │   ├── customers.controller.spec.ts   ← Unit tests (6 tests)
│   │   ├── customers.service.ts           ← Business logic (bcrypt + JWT)
│   │   └── customers.module.ts
│   ├── cart/
│   │   ├── cart.controller.ts             ← /cart endpoints + Swagger
│   │   ├── cart.controller.spec.ts        ← Unit tests (8 tests)
│   │   ├── cart.service.ts                ← Business logic
│   │   └── cart.module.ts
│   ├── orders/
│   │   ├── orders.controller.ts           ← /orders endpoints + Swagger
│   │   ├── orders.controller.spec.ts      ← Unit tests (orders + cancel + JWT)
│   │   ├── orders.service.ts              ← Business logic (cart → order) + admin methods (findAll/findOne/update/exportCsv)
│   │   └── orders.module.ts
│   ├── payments/
│   │   ├── payments.controller.ts         ← /payments endpoints + Swagger
│   │   ├── payments.controller.spec.ts    ← Controller unit tests
│   │   ├── payments.service.ts            ← Business logic
│   │   ├── payments.service.spec.ts       ← Payment + order commit
│   │   └── payments.module.ts
│   └── product.module.ts           ← Root module — aggregates all sub-modules
├── admin/
│   ├── dto/
│   │   ├── admin-auth.dto.ts       ← Admin login/register DTOs
│   │   └── admin.dto.ts            ← Brand, Product, Category, Order, Customer DTOs
│   ├── admin-auth.controller.ts       ← POST /admin/auth/register, /admin/auth/login
│   ├── admin-auth.controller.spec.ts  ← Unit tests (4 tests)
│   ├── admin-auth.service.ts          ← bcrypt + JWT (8h)
│   ├── admin-dashboard.controller.ts       ← GET /admin/dashboard, /admin/dashboard/sales
│   ├── admin-dashboard.controller.spec.ts  ← Unit tests (4 tests)
│   ├── admin-dashboard.service.ts          ← Summary stats, sales report grouped by day
│   ├── admin-images.controller.ts          ← Upload (multipart) + Serve by path
│   ├── admin-images.service.spec.ts        ← Unit tests (image upload/serve)
│   ├── admin-products.controller.ts        ← Brands CRUD + Products CRUD + Stock + Images
│   ├── admin-products.controller.spec.ts  ← Unit tests (14 tests)
│   ├── admin-categories.controller.ts       ← /admin/categories CRUD → injects CategoriesService
│   ├── admin-categories.controller.spec.ts  ← Unit tests (8 tests)
│   ├── admin-customers.controller.ts       ← List, detail, toggle-block
│   ├── admin-customers.controller.spec.ts  ← Unit tests (6 tests)
│   ├── admin-customers.service.ts          ← Customer list + detail with order history + block
│   ├── admin-orders.controller.ts       ← List with filters, update, CSV export → injects OrdersService
│   ├── admin-orders.controller.spec.ts  ← Unit tests (7 tests)
│   ├── brands.service.ts           ← Brand CRUD (admin-scoped, injected into AdminProductsController)
│   └── admin.module.ts             ← Imports CategoriesModule, OrdersModule, ProductsModule
├── prisma/
│   ├── prisma.service.ts           ← Prisma injectable service
│   └── prisma.module.ts
├── app.module.ts
└── main.ts                         ← Swagger + ValidationPipe bootstrap
prisma/
├── schema.prisma                   ← PostgreSQL datasource + models
├── schema.mariadb.prisma           ← Same models, `mysql` provider (MariaDB / MySQL)
├── prisma.config.ts                ← Chooses schema + `migrations/` vs `migrations_mariadb/` from `.env`
├── migrations/                     ← PostgreSQL migration SQL (do not apply on MariaDB)
├── migrations_mariadb/             ← MariaDB migration SQL (do not mix with Postgres)
└── seed.js
scripts/
└── db-setup.js                     ← Automated setup (PostgreSQL only; see README)
```

## Database Schema Overview

| Model            | Description                                                   |
|------------------|---------------------------------------------------------------|
| `Admin`          | Admin accounts (username, password, role)                     |
| `User`           | Auth users (username + password)                              |
| `UserProfile`    | User profile (name, email, birthdate)                         |
| `UserAddress`    | User delivery addresses                                       |
| `Brand`          | Product brands (name, slug, logo, isActive)                   |
| `Category`       | Categories (name, optional image, optional parent, `isActive`) |
| `Tax`            | Named tax bands (`name`, `percent`); products link via `taxId`   |
| `Product`        | HSN, `taxPercent`, optional **`taxId` → Tax**, brand, category; `avgRating`, `reviewCount` |
| `PackSize`       | Pack sizes (25g, 50g, 1kg, etc.)                              |
| `ProductVariant` | Product + pack size combination with price, SKU, stock, `reservedQuantity` |
| `ProductImage`   | Product images (with isPrimary flag)                          |
| `VariantImage`   | Multiple images per product variant                           |
| `ProductSpecification` | Product specs (JSON), shortDescription, longDescription, moreInfo |
| `ProductSpecItem`      | Flat spec items (title, key, value) — enables Amazon-style filtering |
| `Customer`       | E-commerce customers (isBlocked support)                      |
| `CustomerAddress`| Customer delivery addresses                                   |
| `Cart`           | Customer cart                                                 |
| `CartItem`       | Items in a cart                                               |
| `Coupon`         | Promo codes (`percentOff`, caps, min order, expiry)            |
| `CheckoutSession` | Per-customer checkout coupon session (TTL)                  |
| `CheckoutIdempotency` | Maps customer + idempotency key → order (retries)        |
| `ProductReview`  | Rating + comment; unique per customer+product; optional `orderId` |
| `Order`          | Orders: status, address snapshot, discount, coupon, shipping, payment |
| `OrderItem`      | Line items in an order                                        |
| `Payment`        | Payment records (paymentMethod, paymentStatus, paymentDate)   |
| `Shipment`       | Shipment tracking                                             |

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
