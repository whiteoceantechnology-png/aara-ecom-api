import { Module } from "@nestjs/common";
import { CategoriesModule } from "./categories/categories.module";
import { ProductsModule } from "./products/products.module";
import { VariantsModule } from "./variants/variants.module";
import { CustomersModule } from "./customers/customers.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { WishlistModule } from "./wishlist/wishlist.module";

@Module({
  imports: [
    CategoriesModule,
    ProductsModule,
    VariantsModule,
    CustomersModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    CheckoutModule,
    WishlistModule,
  ],
})
export class ProductModule {}
