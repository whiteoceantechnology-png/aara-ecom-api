import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ProductsService } from "./products/products.service";
import { ProductIdDto } from "./dto/product-lookup.dto";

@ApiTags("Product Lookup")
@Controller("product")
export class ProductLookupController {
  constructor(private readonly productsService: ProductsService) {}

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

  @Post("specification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get product specification and description" })
  @ApiBody({ type: ProductIdDto })
  @ApiResponse({
    status: 200,
    description: "Product specifications and description",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  getSpecification(@Body() dto: ProductIdDto) {
    return this.productsService.findSpecification(dto.productId);
  }
}
