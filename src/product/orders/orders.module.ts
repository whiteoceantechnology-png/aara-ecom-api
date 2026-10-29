import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../../common/mail/mail.module";
import { MetaCapiModule } from "../../common/meta-capi/meta-capi.module";

@Module({
  imports: [PrismaModule, MailModule, MetaCapiModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
