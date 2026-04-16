import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import {
  HttpExceptionFilter,
  PrismaExceptionFilter,
  MulterExceptionFilter,
  LoggingInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from "./common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — allow all origins with full method and header support
  app.enableCors({
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  });

  // Global interceptors (order: logging → timeout → transform)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filters (order matters — more specific first)
  app.useGlobalFilters(
    new MulterExceptionFilter(),
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("Aara API")
    .setDescription(
      [
        "E‑commerce REST API: **customers**, **products** (variants, images, reviews), **cart**, **checkout** (coupons, idempotent orders), **payments**, **wishlist**.",
        "",
        "**Categories:** `POST /categories` / `POST /admin/categories` use **`name`** and optional **`categoryImage`** only (no slug field — categories use numeric `id`).",
        "",
        "**Tax:** `GET /taxes` (public) lists rates; use returned **`id`** as **`taxId`** on product create/update. `POST /taxes` creates a new rate (authenticated).",
      ].join("\n"),
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
