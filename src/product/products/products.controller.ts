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
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { ProductDocumentsService } from "./product-documents.service";
import { ReviewsService } from "../reviews/reviews.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "../dto/product.dto";
import { CreateReviewDto, ListReviewsQueryDto } from "../dto/review.dto";
import { CurrentCustomerId } from "../decorators/current-customer.decorator";
import { Public } from "../../auth/public.decorator";

@ApiBearerAuth()
@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly reviewsService: ReviewsService,
    private readonly documentsService: ProductDocumentsService,
  ) {}

  @Public()
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

  // ─── Reviews (must be before :id routes) ───────────────────────────────────

  @Public()
  @Get("reviews")
  @ApiOperation({
    summary: "List product reviews with rating summary",
    description:
      "Public storefront feed. Supports pagination, optional product/rating filters, and sort.",
  })
  @ApiResponse({
    status: 200,
    description: "summary + reviews (with product + isVerified)",
  })
  listReviews(@Query() query: ListReviewsQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Post("reviews")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a product review (verified purchase only)",
    description:
      "Customer JWT required. Order must be DELIVERED and include the product. One review per customer×product.",
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: "Review created" })
  @ApiResponse({ status: 409, description: "Already reviewed this product" })
  createReview(
    @CurrentCustomerId() customerId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(customerId, dto);
  }

  @Public()
  @Get("documents/:documentId/file")
  @ApiOperation({ summary: "Download / view a product COA or SDS file" })
  @ApiParam({ name: "documentId", type: Number })
  async downloadDocument(
    @Param("documentId", ParseIntPipe) documentId: number,
  ) {
    const { file } = await this.documentsService.getFileStream(documentId);
    return file;
  }

  @Public()
  @Get(":id/documents")
  @ApiOperation({ summary: "List COA / SDS documents for a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Product documents" })
  listDocuments(@Param("id", ParseIntPipe) id: number) {
    return this.documentsService.listByProduct(id);
  }

  @Public()
  @Get(":id/reviews")
  @ApiOperation({ summary: "List reviews and rating aggregate for a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Reviews and aggregate" })
  getReviews(@Param("id", ParseIntPipe) id: number) {
    return this.reviewsService.findByProduct(id);
  }

  @Public()
  @Get(":id")
  @ApiOperation({
    summary: "Get product by ID with variants and images",
    description:
      "Includes **`tax`**: `{ id, name, percent }` when `taxId` is set, else `tax: null`. Root `taxPercent` is always stored for pricing.",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Product details" })
  @ApiResponse({ status: 404, description: "Product not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a product",
    description:
      "Optional **`taxId`** (from **GET /taxes**): links product to that tax band; server sets **`taxPercent`** from the tax row. You can still send **`taxPercent`** alone (legacy) when `taxId` is omitted.",
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: "Product created (see `tax` in body when linked)",
  })
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

  @Public()
  @Get(":id/variants")
  @ApiOperation({ summary: "Get all variants for a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "List of variants" })
  findVariants(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findVariants(id);
  }
}
