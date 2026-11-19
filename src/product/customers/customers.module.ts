import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../../common/mail/mail.module";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
