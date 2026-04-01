import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CategoriesModule } from "../product/categories/categories.module";
import { OrdersModule } from "../product/orders/orders.module";
import { ProductsModule } from "../product/products/products.module";
import { VariantsModule } from "../product/variants/variants.module";

import { AdminAuthService } from "./admin-auth.service";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminCustomersService } from "./admin-customers.service";
import { BrandsService } from "./brands.service";

import { AdminAuthController } from "./admin-auth.controller";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminProductsController } from "./admin-products.controller";
import { AdminCategoriesController } from "./admin-categories.controller";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminImagesController } from "./admin-images.controller";
import { AdminImagesService } from "./admin-images.service";
import { AdminVariantsController } from "./admin-variants.controller";
import { AdminRoleGuard } from "../auth/admin-role.guard";

@Module({
  imports: [
    PrismaModule,
    CategoriesModule, // exports CategoriesService → AdminCategoriesController
    OrdersModule, // exports OrdersService     → AdminOrdersController
    ProductsModule, // exports ProductsService   → AdminProductsController
    VariantsModule, // exports VariantsService   → AdminVariantsController
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminCustomersController,
    AdminOrdersController,
    AdminImagesController,
    AdminVariantsController,
  ],
  providers: [
    AdminAuthService,
    AdminDashboardService,
    AdminCustomersService,
    BrandsService, // scoped to admin; no public-facing BrandsModule needed
    AdminImagesService,
    AdminRoleGuard,
  ],
})
export class AdminModule {}
