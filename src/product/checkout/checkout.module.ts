import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CartModule } from "../cart/cart.module";
import { OrdersModule } from "../orders/orders.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [PrismaModule, CartModule, OrdersModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
