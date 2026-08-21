import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { UserModule } from "./user/user.module";
import { ProductModule } from "./product/product.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // `.env.local` (gitignored) overrides `.env` — use for live Razorpay / secrets
      envFilePath: [".env.local", ".env"],
    }),
    AuthModule,
    UserModule,
    ProductModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
