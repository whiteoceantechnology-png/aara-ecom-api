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

**Aara API** — A NestJS REST API with PostgreSQL (via Prisma) for an e-commerce platform. Provides full authentication, user profile & address management, product catalogue (categories, products, variants, brands), cart, orders, payments, customer management, and a complete **Admin panel** (dashboard, product/category/brand management, customer moderation, order management with CSV export).

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL
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

```bash
cp .env.example .env
```

Edit `.env` — for macOS with trust auth (no password), use:

```env
DATABASE_URL="postgresql://admin@localhost:5432/ecomdb"
JWT_SECRET="your_jwt_secret_here"
PORT=3008
```

> ⚠️ If your password contains special characters like `@`, URL-encode them.
> For example, `abc@123` becomes `abc%40123` in the `DATABASE_URL`.

### 3. Database Setup (Single Command)

Run the following command to automatically:
- ✅ Create the PostgreSQL user (if not exists)
- ✅ Create the database (if not exists)
- ✅ Grant all required privileges
- ✅ Run all Prisma migrations
- ✅ Generate the Prisma client

```bash
npm run db:setup
```

### 4. Generate Prisma Client (if needed)

If you encounter a `Cannot find module '.prisma/client/default'` error:

```bash
npx prisma generate
```

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
| `GET /products/:id/variants` | Variants for a product |
| `POST /product/variant` | Product variant lookup |
| `POST /product/specification` | Product specification lookup |

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

### 📦 Products

| Method   | Endpoint                       | Auth | Description                          |
|----------|--------------------------------|------|--------------------------------------|
| `GET`    | `/products`                    | 🔓   | Get all products                     |
| `GET`    | `/products?category=1`         | 🔓   | Filter products by category ID       |
| `GET`    | `/products?search=ashwagandha` | 🔓   | Search products by name              |
| `GET`    | `/products?specKey=Fabric&specValue=Cotton` | 🔓 | Filter by spec (Amazon-style) |
| `GET`    | `/products/:id`                | 🔓   | Get product by ID (includes variants)|
| `GET`    | `/products/:id/variants`       | 🔓   | Get all variants for a product       |
| `POST`   | `/products`                    | 🔒   | Create a product                     |
| `PUT`    | `/products/:id`                | 🔒   | Update a product                     |
| `DELETE` | `/products/:id`                | 🔒   | Delete a product                     |

### 🔎 Product Lookup (Frontend APIs)

| Method   | Endpoint                  | Auth | Description                                    |
|----------|---------------------------|------|------------------------------------------------|
| `POST`   | `/product/variant`        | 🔓   | Get variants with images, colors, stock, price |
| `POST`   | `/product/specification`  | 🔓   | Get product specification (shortDescription, longDescription, moreInfoHtml) |

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

### 🛒 Cart

| Method   | Endpoint                        | Auth | Description                    |
|----------|---------------------------------|------|--------------------------------|
| `GET`    | `/cart/:customerId`             | 🔒   | Get cart for a customer        |
| `POST`   | `/cart/add`                     | 🔒   | Add item to cart               |
| `PUT`    | `/cart/update`                  | 🔒   | Update cart item quantity      |
| `DELETE` | `/cart/remove/:cartItemId`      | 🔒   | Remove item from cart          |

### 📋 Orders

| Method   | Endpoint                  | Auth | Description                          |
|----------|---------------------------|------|--------------------------------------|
| `POST`   | `/orders`                 | 🔒   | Create order from cart               |
| `GET`    | `/orders`                 | 🔒   | Get all orders                       |
| `GET`    | `/orders?customerId=1`    | 🔒   | Get orders filtered by customer      |
| `GET`    | `/orders/:id`             | 🔒   | Get order by ID                      |
| `PUT`    | `/orders/:id/status`      | 🔒   | Update order status                  |

### 💳 Payments

| Method   | Endpoint                        | Auth | Description                    |
|----------|---------------------------------|------|--------------------------------|
| `POST`   | `/payments`                     | 🔒   | Create payment for an order    |
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

### Example: Create Order (from cart)
```bash
curl -X POST http://localhost:3008/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "customerId": 1, "cartId": 1 }'
```

**Response `201`:**
```json
{
  "id": 1,
  "orderNumber": "ORD-1741700835000",
  "status": "pending",
  "totalAmount": "62",
  "paymentStatus": "pending",
  "items": [
    {
      "productName": "Ashwagandha Root",
      "sizeLabel": "25 g",
      "price": "31",
      "quantity": 2,
      "subtotal": "62"
    }
  ]
}
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
| `POST`   | `/admin/categories`        | 🔒   | Create category                              |
| `PUT`    | `/admin/categories/:id`    | 🔒   | Edit category name, slug, or active status   |
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
| `npm run db:setup`   | Full setup — create user, DB, grants, migrate, generate  |
| `npm run db:migrate` | Run pending migrations only                              |
| `npm run db:generate`| Regenerate Prisma client only                            |
| `npm run db:reset`   | ⚠️ Drop and recreate DB (deletes all data)               |

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

| Spec File                                          | Tests | What's Covered                                                       |
|----------------------------------------------------|-------|----------------------------------------------------------------------|
| `auth/auth.service.spec.ts`                        | 16    | All service methods with edge cases                                  |
| `auth/auth.controller.spec.ts`                     | 5     | All auth controller endpoints                                        |
| `auth/user.repository.spec.ts`                     | 10    | All repository database operations                                   |
| `product/categories/categories.controller.spec.ts` | 7     | CRUD + NotFoundException cases                                       |
| `product/products/products.controller.spec.ts`     | 9     | CRUD + filter/search + variants endpoint                             |
| `product/variants/variants.controller.spec.ts`     | 5     | Create, update, delete + NotFoundException                           |
| `product/customers/customers.controller.spec.ts`   | 6     | Register, login (JWT), getById + error cases                         |
| `product/cart/cart.controller.spec.ts`             | 8     | Get, add, update, remove + edge cases                                |
| `product/orders/orders.controller.spec.ts`         | 7     | Create, findAll (with filter), findOne, updateStatus                 |
| `product/payments/payments.controller.spec.ts`     | 6     | Create, findByOrder, findOne + NotFoundException                     |
| `admin/admin-auth.controller.spec.ts`              | 4     | Register (conflict), login (valid + invalid credentials)             |
| `admin/admin-dashboard.controller.spec.ts`         | 4     | Summary stats, sales report (default + custom days)                  |
| `admin/admin-categories.controller.spec.ts`        | 8     | Admin CRUD + NotFoundException + empty list                          |
| `admin/admin-products.controller.spec.ts`          | 14    | Brand CRUD, product CRUD, stock update, image add/delete             |
| `admin/admin-customers.controller.spec.ts`         | 6     | List (filter, search), detail (totalSpent), toggle-block             |
| `admin/admin-orders.controller.spec.ts`            | 7     | List (filters), findOne, update, CSV export with correct headers     |
| `app.controller.spec.ts`                           | 1     | App health check                                                     |

**Total: 144 tests across 17 suites — all passing ✅**

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
│   │   └── order.dto.ts            ← Order/payment DTOs
│   ├── product-lookup.controller.ts ← POST /product/variant, /product/specification
│   ├── categories/
│   │   ├── categories.controller.ts       ← /categories endpoints + Swagger
│   │   ├── categories.controller.spec.ts  ← Unit tests (7 tests)
│   │   ├── categories.service.ts          ← Business logic (public + admin methods)
│   │   └── categories.module.ts
│   ├── products/
│   │   ├── products.controller.ts         ← /products endpoints + Swagger
│   │   ├── products.controller.spec.ts    ← Unit tests (9 tests)
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
│   │   ├── orders.controller.spec.ts      ← Unit tests (7 tests)
│   │   ├── orders.service.ts              ← Business logic (cart → order) + admin methods (findAll/findOne/update/exportCsv)
│   │   └── orders.module.ts
│   ├── payments/
│   │   ├── payments.controller.ts         ← /payments endpoints + Swagger
│   │   ├── payments.controller.spec.ts    ← Unit tests (6 tests)
│   │   ├── payments.service.ts            ← Business logic
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
│   ├── admin-products.controller.ts       ← Brands CRUD + Products CRUD + Stock + Images
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
├── schema.prisma                   ← DB schema (User, UserProfile, UserAddress, Category,
│                                     Product, PackSize, ProductVariant, ProductImage,
│                                     Customer, CustomerAddress, Cart, CartItem,
│                                     Order, OrderItem, Payment, Shipment)
├── prisma.config.ts                ← Prisma 7 config
└── migrations/                     ← Migration history
scripts/
└── db-setup.sh                     ← Full DB setup script
```

## Database Schema Overview

| Model            | Description                                                   |
|------------------|---------------------------------------------------------------|
| `Admin`          | Admin accounts (username, password, role)                     |
| `User`           | Auth users (username + password)                              |
| `UserProfile`    | User profile (name, email, birthdate)                         |
| `UserAddress`    | User delivery addresses                                       |
| `Brand`          | Product brands (name, slug, logo, isActive)                   |
| `Category`       | Product categories — supports parent/child hierarchy          |
| `Product`        | Products with HSN code, tax, brand, category, status          |
| `PackSize`       | Pack sizes (25g, 50g, 1kg, etc.)                              |
| `ProductVariant` | Product + pack size combination with price, SKU, stock        |
| `ProductImage`   | Product images (with isPrimary flag)                          |
| `VariantImage`   | Multiple images per product variant                           |
| `ProductSpecification` | Product specs (JSON), shortDescription, longDescription, moreInfo |
| `ProductSpecItem`      | Flat spec items (title, key, value) — enables Amazon-style filtering |
| `Customer`       | E-commerce customers (isBlocked support)                      |
| `CustomerAddress`| Customer delivery addresses                                   |
| `Cart`           | Customer cart                                                 |
| `CartItem`       | Items in a cart                                               |
| `Order`          | Orders with status, trackingId, notes, paymentStatus          |
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
