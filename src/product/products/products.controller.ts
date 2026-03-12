import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "../dto/product.dto";

@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: "Get all products — filter by ?category=1 or ?search=ashwagandha",
  })
  @ApiQuery({ name: "category", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "List of products with variants" })
  findAll(@Query() filter: ProductFilterDto) {
    return this.productsService.findAll(filter);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product by ID with variants and images" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Product details" })
  @ApiResponse({ status: 404, description: "Product not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a product" })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: "Product created" })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: "Product updated" })
  @ApiResponse({ status: 404, description: "Product not found" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Product deleted" })
  @ApiResponse({ status: 404, description: "Product not found" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Get(":id/variants")
  @ApiOperation({ summary: "Get all variants for a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "List of variants" })
  findVariants(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findVariants(id);
  }
}
