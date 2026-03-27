import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RazorpayService } from "./razorpay.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
