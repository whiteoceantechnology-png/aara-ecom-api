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
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { ProductsService } from "../product/products/products.service";
import { ProductDocumentsService } from "../product/products/product-documents.service";
import { BrandsService } from "./brands.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import {
  CreateBrandDto,
  UpdateBrandDto,
  AdminCreateProductDto,
  AdminUpdateProductDto,
  AdminUpdateStockDto,
  AdminUpdateProductStockDto,
  AdminAddImageDto,
  UpsertSpecificationBodyDto,
  UpsertProductPoliciesDto,
} from "./dto/admin.dto";
import { AdminProductPoliciesService } from "./admin-product-policies.service";

@ApiBearerAuth()
@ApiTags("Admin — Products & Brands")
@Controller("admin")
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly brandsService: BrandsService,
    private readonly documentsService: ProductDocumentsService,
    private readonly productPoliciesService: AdminProductPoliciesService,
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
    summary: "List all products with search/category/brand/spec filters",
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "categoryId", required: false, type: Number })
  @ApiQuery({ name: "brandId", required: false, type: Number })
  @ApiQuery({ name: "specKey", required: false, type: String })
  @ApiQuery({ name: "specValue", required: false, type: String })
  getProducts(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("brandId") brandId?: string,
    @Query("specKey") specKey?: string,
    @Query("specValue") specValue?: string,
  ) {
    return this.productsService.adminFindAll(
      search,
      categoryId ? parseInt(categoryId) : undefined,
      brandId ? parseInt(brandId) : undefined,
      specKey,
      specValue,
    );
  }

  // ─── Product policies (singleton JSON) — must be before products/:id ─────────

  @UseGuards(AdminRoleGuard)
  @Get("products/policies")
  @ApiOperation({ summary: "Get product policies JSON" })
  getProductPolicies() {
    return this.productPoliciesService.get();
  }

  @UseGuards(AdminRoleGuard)
  @Post("products/policies")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create product policies (one-time store)" })
  @ApiBody({ type: UpsertProductPoliciesDto })
  createProductPolicies(@Body() dto: UpsertProductPoliciesDto) {
    return this.productPoliciesService.create(dto);
  }

  @UseGuards(AdminRoleGuard)
  @Put("products/policies")
  @ApiOperation({ summary: "Update product policies JSON" })
  @ApiBody({ type: UpsertProductPoliciesDto })
  updateProductPolicies(@Body() dto: UpsertProductPoliciesDto) {
    return this.productPoliciesService.update(dto);
  }

  @UseGuards(AdminRoleGuard)
  @Delete("products/policies")
  @ApiOperation({ summary: "Delete product policies" })
  deleteProductPolicies() {
    return this.productPoliciesService.remove();
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

  // ─── COA / SDS documents ─────────────────────────────────────────────────────

  @UseGuards(AdminRoleGuard)
  @Get("products/:productId/documents")
  @ApiOperation({ summary: "List COA / SDS documents for a product" })
  @ApiParam({ name: "productId", type: Number })
  listDocuments(@Param("productId", ParseIntPipe) productId: number) {
    return this.documentsService.listByProduct(productId);
  }

  @UseGuards(AdminRoleGuard)
  @Post("products/:productId/documents")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("document", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload COA / MSDS / SDS document",
    description:
      "multipart fields: `documentType` (COA|MSDS|SDS), `documentTitle`, `document` (PDF/image file)",
  })
  @ApiParam({ name: "productId", type: Number })
  @ApiBody({
    schema: {
      type: "object",
      required: ["documentType", "documentTitle", "document"],
      properties: {
        documentType: { type: "string", enum: ["COA", "MSDS", "SDS"] },
        documentTitle: { type: "string" },
        document: { type: "string", format: "binary" },
      },
    },
  })
  createDocument(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() body: { documentType?: string; documentTitle?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.create(
      productId,
      {
        documentType: body.documentType || "",
        documentTitle: body.documentTitle || "",
      },
      file,
    );
  }

  @UseGuards(AdminRoleGuard)
  @Put("products/:productId/documents/:documentId")
  @UseInterceptors(
    FileInterceptor("document", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update COA / SDS metadata and optionally replace file",
  })
  @ApiParam({ name: "productId", type: Number })
  @ApiParam({ name: "documentId", type: Number })
  updateDocument(
    @Param("productId", ParseIntPipe) productId: number,
    @Param("documentId", ParseIntPipe) documentId: number,
    @Body() body: { documentType?: string; documentTitle?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.update(
      productId,
      documentId,
      {
        documentType: body.documentType,
        documentTitle: body.documentTitle,
      },
      file,
    );
  }

  @UseGuards(AdminRoleGuard)
  @Delete("products/:productId/documents/:documentId")
  @ApiOperation({ summary: "Delete a product COA / SDS document" })
  @ApiParam({ name: "productId", type: Number })
  @ApiParam({ name: "documentId", type: Number })
  deleteDocument(
    @Param("productId", ParseIntPipe) productId: number,
    @Param("documentId", ParseIntPipe) documentId: number,
  ) {
    return this.documentsService.remove(productId, documentId);
  }

  // ─── Stock ───────────────────────────────────────────────────────────────────

  @Put("products/:id/stock")
  @ApiOperation({
    summary: "Set product-level stock pool (source of truth for availability)",
  })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  @ApiBody({ type: AdminUpdateProductStockDto })
  updateProductStock(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateProductStockDto,
  ) {
    return this.productsService.updateProductStock(id, dto.stock);
  }

  @Put("variants/:id/stock")
  @ApiOperation({
    summary:
      "Set product-pool stock via variant id (legacy; prefer PUT /admin/products/:id/stock)",
  })
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

  // ─── Specification ─────────────────────────────────────────────────────────

  @Put("products/:id/specification")
  @ApiOperation({
    summary:
      "Create or update product specification (JSON for UI + flat table for filtering)",
  })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  @ApiBody({ type: UpsertSpecificationBodyDto })
  upsertSpecification(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertSpecificationBodyDto,
  ) {
    return this.productsService.upsertSpecification({ ...dto, productId: id });
  }

  @Delete("products/:id/specification")
  @ApiOperation({ summary: "Delete product specification" })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  deleteSpecification(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.deleteSpecification(id);
  }
}
