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
import { AdminReportsService } from "./admin-reports.service";
import { AdminShippingRulesService } from "./admin-shipping-rules.service";
import { AdminSettingsService } from "./admin-settings.service";
import { AdminSearchService } from "./admin-search.service";
import { AdminOrdersService } from "./admin-orders.service";
import { AdminInventoryService } from "./admin-inventory.service";
import { AdminPaymentsService } from "./admin-payments.service";
import { AdminLogisticsService } from "./admin-logistics.service";

import { AdminAuthController } from "./admin-auth.controller";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminProductsController } from "./admin-products.controller";
import { AdminCategoriesController } from "./admin-categories.controller";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminImagesController } from "./admin-images.controller";
import { AdminImagesService } from "./admin-images.service";
import { AdminVariantsController } from "./admin-variants.controller";
import { AdminMasterdataController } from "./admin-masterdata.controller";
import { AdminMasterdataService } from "./admin-masterdata.service";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminShippingRulesController } from "./admin-shipping-rules.controller";
import { AdminSettingsController } from "./admin-settings.controller";
import { AdminSearchController } from "./admin-search.controller";
import { AdminInventoryController } from "./admin-inventory.controller";
import { AdminPaymentsController } from "./admin-payments.controller";
import { AdminLogisticsController } from "./admin-logistics.controller";
import { AdminRoleGuard } from "../auth/admin-role.guard";

@Module({
  imports: [
    PrismaModule,
    CategoriesModule,
    OrdersModule,
    ProductsModule,
    VariantsModule,
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
    AdminMasterdataController,
    AdminReportsController,
    AdminShippingRulesController,
    AdminSettingsController,
    AdminSearchController,
    AdminInventoryController,
    AdminPaymentsController,
    AdminLogisticsController,
  ],
  providers: [
    AdminAuthService,
    AdminDashboardService,
    AdminCustomersService,
    BrandsService,
    AdminImagesService,
    AdminMasterdataService,
    AdminReportsService,
    AdminShippingRulesService,
    AdminSettingsService,
    AdminSearchService,
    AdminOrdersService,
    AdminInventoryService,
    AdminPaymentsService,
    AdminLogisticsService,
    AdminRoleGuard,
  ],
})
export class AdminModule {}
