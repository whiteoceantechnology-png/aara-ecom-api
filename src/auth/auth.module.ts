import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserRepository } from "./user.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomersModule } from "../product/customers/customers.module";

@Module({
  imports: [PrismaModule, CustomersModule],
  controllers: [AuthController],
  providers: [AuthService, UserRepository],
})
export class AuthModule {}
