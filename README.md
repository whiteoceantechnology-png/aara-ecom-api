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

**Aara API** — A NestJS REST API with PostgreSQL (via Prisma) for an e-commerce platform. Provides full authentication, user profile & address management, product catalogue (categories, products, variants), cart, orders, payments, and customer management.

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL
- **ORM**: Prisma v7
- **Auth**: JWT + bcrypt
- **Docs**: Swagger UI (`/api/docs`)
- **Validation**: class-validator / class-transformer

---

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) running locally
- npm

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
$ git clone <your-repo-url>
$ cd aara-api
$ npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (or update the existing one):

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB"
JWT_SECRET="your_jwt_secret_here"
PORT=3008
```

> ⚠️ **Note:** If your password contains special characters like `@`, URL-encode them.
> For example, `abc@123` becomes `abc%40123` in the `DATABASE_URL`.

### 3. Database Setup (Single Command)

Run the following command to automatically:
- ✅ Create the PostgreSQL user (if not exists)
- ✅ Create the database (if not exists)
- ✅ Grant all required privileges
- ✅ Run all Prisma migrations
- ✅ Generate the Prisma client

```bash
$ npm run db:setup
```

### 4. Generate Prisma Client

If the Prisma client is missing or you encounter a `Cannot find module '.prisma/client/default'` error, run:

```bash
$ npx prisma generate
```

> ℹ️ This is already handled automatically by `npm run db:setup`, but run this manually if needed after installing dependencies.

### 5. Run the Application

```bash
# development (watch mode)
$ npm run start:dev

# standard mode
$ npm run start

# production mode
$ npm run start:prod
```

The API will be available at: **http://localhost:3008**
Swagger docs at: **http://localhost:3008/api/docs**

---

## API Endpoints

### 🔐 Auth

| Method   | Endpoint                  | Description                          |
|----------|---------------------------|--------------------------------------|
| `POST`   | `/auth/register`          | Register a new user (with optional profile) |
| `POST`   | `/auth/login`             | Login and receive a JWT token        |
| `PATCH`  | `/auth/update/:id`        | Update username or password          |
| `POST`   | `/auth/forgot-password`   | Request a password reset token       |
| `POST`   | `/auth/reset-password`    | Reset password using the reset token |

### 👤 User

| Method   | Endpoint                          | Description                    |
|----------|-----------------------------------|--------------------------------|
| `GET`    | `/user/:id/details`               | Get user profile details       |
| `GET`    | `/user/:id/address`               | Get all addresses for a user   |
| `POST`   | `/user/:id/address`               | Add a new address              |
| `PATCH`  | `/user/:id/address/:addressId`    | Edit an existing address       |
| `DELETE` | `/user/:id/address/:addressId`    | Remove an address              |

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
curl http://localhost:3008/user/1/details
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
curl http://localhost:3008/user/1/address
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
  -d '{ "city": "Coimbatore", "pincode": "641001" }'
```

### Example: Remove Address
```bash
curl -X DELETE http://localhost:3008/user/1/address/1
```

---

## API Endpoints — E-Commerce

### 🗂️ Categories

| Method   | Endpoint              | Description              |
|----------|-----------------------|--------------------------|
| `GET`    | `/categories`         | Get all categories       |
| `GET`    | `/categories/:id`     | Get category by ID       |
| `POST`   | `/categories`         | Create a category        |
| `PUT`    | `/categories/:id`     | Update a category        |
| `DELETE` | `/categories/:id`     | Delete a category        |

### 📦 Products

| Method   | Endpoint                    | Description                              |
|----------|-----------------------------|------------------------------------------|
| `GET`    | `/products`                 | Get all products                         |
| `GET`    | `/products?category=1`      | Filter products by category ID           |
| `GET`    | `/products?search=ashwagandha` | Search products by name              |
| `GET`    | `/products/:id`             | Get product by ID (includes variants)    |
| `POST`   | `/products`                 | Create a product                         |
| `PUT`    | `/products/:id`             | Update a product                         |
| `DELETE` | `/products/:id`             | Delete a product                         |
| `GET`    | `/products/:id/variants`    | Get all variants for a product           |

### 🔢 Variants

| Method   | Endpoint          | Description             |
|----------|-------------------|-------------------------|
| `POST`   | `/variants`       | Create a product variant |
| `PUT`    | `/variants/:id`   | Update a variant        |
| `DELETE` | `/variants/:id`   | Delete a variant        |

### 🧑 Customers

| Method   | Endpoint                  | Description              |
|----------|---------------------------|--------------------------|
| `POST`   | `/customers/register`     | Register a new customer  |
| `POST`   | `/customers/login`        | Customer login (JWT)     |
| `GET`    | `/customers/:id`          | Get customer by ID       |

### 🛒 Cart

| Method   | Endpoint                        | Description                    |
|----------|---------------------------------|--------------------------------|
| `GET`    | `/cart/:customerId`             | Get cart for a customer        |
| `POST`   | `/cart/add`                     | Add item to cart               |
| `PUT`    | `/cart/update`                  | Update cart item quantity      |
| `DELETE` | `/cart/remove/:cartItemId`      | Remove item from cart          |

### 📋 Orders

| Method   | Endpoint                  | Description                          |
|----------|---------------------------|--------------------------------------|
| `POST`   | `/orders`                 | Create order from cart               |
| `GET`    | `/orders`                 | Get all orders                       |
| `GET`    | `/orders?customerId=1`    | Get orders filtered by customer      |
| `GET`    | `/orders/:id`             | Get order by ID                      |
| `PUT`    | `/orders/:id/status`      | Update order status                  |

### 💳 Payments

| Method   | Endpoint                        | Description                    |
|----------|---------------------------------|--------------------------------|
| `POST`   | `/payments`                     | Create payment for an order    |
| `GET`    | `/payments/order/:orderId`      | Get all payments for an order  |
| `GET`    | `/payments/:id`                 | Get payment by ID              |

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
  -d '{ "customerId": 1, "variantId": 1, "quantity": 2 }'
```

### Example: Create Order (from cart)
```bash
curl -X POST http://localhost:3008/orders \
  -H "Content-Type: application/json" \
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
curl http://localhost:3008/payments/order/1
```

### Example: Update Order Status
```bash
curl -X PUT http://localhost:3008/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "shipped" }'
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

| Spec File                                          | Tests | What's Covered                                      |
|----------------------------------------------------|-------|-----------------------------------------------------|
| `auth/auth.service.spec.ts`                        | 16    | All service methods with edge cases                 |
| `auth/auth.controller.spec.ts`                     | 5     | All auth controller endpoints                       |
| `auth/user.repository.spec.ts`                     | 10    | All repository database operations                  |
| `product/categories/categories.controller.spec.ts` | 7     | CRUD + NotFoundException cases                      |
| `product/products/products.controller.spec.ts`     | 9     | CRUD + filter/search + variants endpoint            |
| `product/variants/variants.controller.spec.ts`     | 5     | Create, update, delete + NotFoundException          |
| `product/customers/customers.controller.spec.ts`   | 6     | Register, login (JWT), getById + error cases        |
| `product/cart/cart.controller.spec.ts`             | 8     | Get, add, update, remove + edge cases               |
| `product/orders/orders.controller.spec.ts`         | 7     | Create, findAll (with filter), findOne, updateStatus|
| `product/payments/payments.controller.spec.ts`     | 6     | Create, findByOrder, findOne + NotFoundException    |
| `app.controller.spec.ts`                           | 1     | App health check                                    |

**Total: 86 tests across 11 suites — all passing ✅**

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
│   │   ├── variant.dto.ts          ← Variant create/update DTOs
│   │   ├── customer.dto.ts         ← Customer register/login DTOs
│   │   ├── cart.dto.ts             ← Cart add/update/remove DTOs
│   │   └── order.dto.ts            ← Order/payment DTOs
│   ├── categories/
│   │   ├── categories.controller.ts       ← /categories endpoints + Swagger
│   │   ├── categories.controller.spec.ts  ← Unit tests (7 tests)
│   │   ├── categories.service.ts          ← Business logic
│   │   └── categories.module.ts
│   ├── products/
│   │   ├── products.controller.ts         ← /products endpoints + Swagger
│   │   ├── products.controller.spec.ts    ← Unit tests (9 tests)
│   │   ├── products.service.ts            ← Business logic
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
│   │   ├── orders.service.ts              ← Business logic (cart → order)
│   │   └── orders.module.ts
│   ├── payments/
│   │   ├── payments.controller.ts         ← /payments endpoints + Swagger
│   │   ├── payments.controller.spec.ts    ← Unit tests (6 tests)
│   │   ├── payments.service.ts            ← Business logic
│   │   └── payments.module.ts
│   └── product.module.ts           ← Root module — aggregates all sub-modules
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

| Model            | Description                                      |
|------------------|--------------------------------------------------|
| `User`           | Auth users (username + password)                 |
| `UserProfile`    | User profile (name, email, birthdate)            |
| `UserAddress`    | User delivery addresses                          |
| `Category`       | Product categories (supports parent/child)       |
| `Product`        | Products with HSN code & tax                     |
| `PackSize`       | Pack sizes (25g, 50g, 1kg, etc.)                 |
| `ProductVariant` | Product + pack size combination with price & SKU |
| `ProductImage`   | Product images                                   |
| `Customer`       | E-commerce customers                             |
| `CustomerAddress`| Customer delivery addresses                      |
| `Cart`           | Customer cart                                    |
| `CartItem`       | Items in a cart                                  |
| `Order`          | Orders placed by customers                       |
| `OrderItem`      | Line items in an order                           |
| `Payment`        | Payment records                                  |
| `Shipment`       | Shipment tracking                                |

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
