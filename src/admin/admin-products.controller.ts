import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { ProductsService } from "../product/products/products.service";
import { BrandsService } from "./brands.service";
import {
  CreateBrandDto,
  UpdateBrandDto,
  AdminCreateProductDto,
  AdminUpdateProductDto,
  AdminUpdateStockDto,
  AdminAddImageDto,
} from "./dto/admin.dto";

@ApiTags("Admin — Products & Brands")
@Controller("admin")
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly brandsService: BrandsService,
  ) {}

  // ─── Brands ──────────────────────────────────────────────────────────────────

  @Get("brands")
  @ApiOperation({ summary: "Get all brands" })
  getBrands() {
    return this.brandsService.findAll();
  }

  @Post("brands")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a brand" })
  @ApiBody({ type: CreateBrandDto })
  createBrand(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Put("brands/:id")
  @ApiOperation({ summary: "Update a brand" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateBrandDto })
  updateBrand(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, dto);
  }

  @Delete("brands/:id")
  @ApiOperation({ summary: "Delete a brand" })
  @ApiParam({ name: "id", type: Number })
  deleteBrand(@Param("id", ParseIntPipe) id: number) {
    return this.brandsService.remove(id);
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  @Get("products")
  @ApiOperation({
    summary: "List all products with search/category/brand filters",
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "categoryId", required: false, type: Number })
  @ApiQuery({ name: "brandId", required: false, type: Number })
  getProducts(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("brandId") brandId?: string,
  ) {
    return this.productsService.adminFindAll(
      search,
      categoryId ? parseInt(categoryId) : undefined,
      brandId ? parseInt(brandId) : undefined,
    );
  }

  @Get("products/:id")
  @ApiOperation({
    summary: "Get product detail (variants, images, brand, category)",
  })
  @ApiParam({ name: "id", type: Number })
  getProduct(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.adminFindOne(id);
  }

  @Post("products")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a product" })
  @ApiBody({ type: AdminCreateProductDto })
  createProduct(@Body() dto: AdminCreateProductDto) {
    return this.productsService.adminCreate(dto);
  }

  @Put("products/:id")
  @ApiOperation({
    summary: "Update product (name, description, category, brand, tax, status)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdateProductDto })
  updateProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateProductDto,
  ) {
    return this.productsService.adminUpdate(id, dto);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", type: Number })
  deleteProduct(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.adminDelete(id);
  }

  // ─── Stock ───────────────────────────────────────────────────────────────────

  @Put("variants/:id/stock")
  @ApiOperation({ summary: "Update stock quantity for a variant" })
  @ApiParam({ name: "id", type: Number, description: "Variant ID" })
  @ApiBody({ type: AdminUpdateStockDto })
  updateStock(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateStockDto,
  ) {
    return this.productsService.updateStock(id, dto);
  }

  // ─── Images ──────────────────────────────────────────────────────────────────

  @Post("products/:id/images")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add an image to a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminAddImageDto })
  addImage(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminAddImageDto,
  ) {
    return this.productsService.addImage(id, dto);
  }

  @Delete("images/:id")
  @ApiOperation({ summary: "Delete a product image" })
  @ApiParam({ name: "id", type: Number, description: "Image ID" })
  deleteImage(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.deleteImage(id);
  }
}
