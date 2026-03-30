import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ProductsService } from "./products/products.service";
import { ProductIdDto } from "./dto/product-lookup.dto";
import { UpsertSpecificationBodyDto } from "../admin/dto/admin.dto";
import { Public } from "../auth/public.decorator";

@ApiTags("Product Lookup")
@Controller("product")
export class ProductLookupController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Post("variant")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get product variants by product ID" })
  @ApiBody({ type: ProductIdDto })
  @ApiResponse({
    status: 200,
    description: "List of variants with images, colors, stock, and pricing",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  getVariants(@Body() dto: ProductIdDto) {
    return this.productsService.findVariantsByProductId(dto.productId);
  }

  @Public()
  @Get("specification/:id")
  @ApiOperation({
    summary: "Get product specification and description (by product ID)",
  })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  @ApiResponse({
    status: 200,
    description:
      "Specification JSON, description fields, and category name for PDP",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  getSpecification(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findSpecification(id);
  }

  @ApiBearerAuth()
  @Post("specification/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Create or update product specification (sections + description HTML)",
  })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  @ApiBody({ type: UpsertSpecificationBodyDto })
  @ApiResponse({
    status: 200,
    description: "Same shape as GET — full specification payload after save",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Product not found" })
  upsertSpecification(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertSpecificationBodyDto,
  ) {
    return this.productsService.upsertSpecification({ ...dto, productId: id });
  }
}
