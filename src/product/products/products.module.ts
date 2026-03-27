import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductLookupController } from "../product-lookup.controller";
import { ProductsService } from "./products.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { ReviewsModule } from "../reviews/reviews.module";

@Module({
  imports: [PrismaModule, ReviewsModule],
  controllers: [ProductsController, ProductLookupController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
