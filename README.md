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

**Aara API** — A NestJS REST API with PostgreSQL (via Prisma) providing full authentication endpoints including register, login, update user, forgot password and reset password.

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

### 4. Run the Application

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

| Method   | Endpoint                  | Description                          |
|----------|---------------------------|--------------------------------------|
| `POST`   | `/auth/register`          | Register a new user                  |
| `POST`   | `/auth/login`             | Login and receive a JWT token        |
| `PATCH`  | `/auth/update/:id`        | Update username or password          |
| `POST`   | `/auth/forgot-password`   | Request a password reset token       |
| `POST`   | `/auth/reset-password`    | Reset password using the reset token |

### Example: Register
```bash
curl -X POST http://localhost:3008/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "john_doe", "password": "Secret@123" }'
```

### Example: Login
```bash
curl -X POST http://localhost:3008/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "john_doe", "password": "Secret@123" }'
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

### Test Coverage (Auth Module)

| Spec File                    | Tests | What's Covered                            |
|------------------------------|-------|-------------------------------------------|
| `auth.service.spec.ts`       | 16    | All service methods with edge cases       |
| `auth.controller.spec.ts`    | 5     | All controller endpoints                  |
| `user.repository.spec.ts`    | 10    | All repository database operations        |

---

## Project Structure

```
src/
├── auth/
│   ├── dto/
│   │   ├── register.dto.ts         ← Input validation
│   │   ├── login.dto.ts
│   │   ├── update-user.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   └── auth-response.dto.ts    ← Response types
│   ├── auth.controller.ts          ← HTTP layer + Swagger
│   ├── auth.controller.spec.ts     ← Controller unit tests
│   ├── auth.service.ts             ← Business logic
│   ├── auth.service.spec.ts        ← Service unit tests
│   ├── auth.module.ts              ← NestJS module
│   ├── user.repository.ts          ← Data access layer
│   └── user.repository.spec.ts     ← Repository unit tests
├── prisma/
│   ├── prisma.service.ts           ← Prisma injectable service
│   └── prisma.module.ts
├── app.module.ts
└── main.ts                         ← Swagger + ValidationPipe bootstrap
prisma/
├── schema.prisma                   ← DB schema (User model)
├── prisma.config.ts                ← Prisma 7 config
└── migrations/                     ← Migration history
scripts/
└── db-setup.sh                     ← Full DB setup script
```

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
