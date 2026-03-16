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
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ProductService } from "./product.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "./dto/product.dto";
import { CreateVariantDto, UpdateVariantDto } from "./dto/variant.dto";
import { ProductIdDto } from "./dto/product-lookup.dto";
import { CreateCustomerDto, CustomerLoginDto } from "./dto/customer.dto";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CreatePaymentDto,
} from "./dto/order.dto";
import { Public } from "../auth/public.decorator";

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly service: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all categories" })
  getAll() {
    return this.service.getCategories();
  }

  @Public()
  @Get(":id/products")
  @ApiOperation({ summary: "Get products by category ID" })
  @ApiParam({ name: "id", type: Number })
  getCategoryProducts(@Param("id", ParseIntPipe) id: number) {
    return this.service.getCategoryProducts(id);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get category by ID" })
  @ApiParam({ name: "id", type: Number })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getCategoryById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a category" })
  @ApiBody({ type: CreateCategoryDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateCategoryDto })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", type: Number })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.deleteCategory(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Products")
@Controller("products")
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all products (filter by category or search)" })
  @ApiQuery({
    name: "category",
    required: false,
    type: Number,
    description: "Filter by category ID",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by name",
  })
  getAll(@Query() filter: ProductFilterDto) {
    return this.service.getProducts(filter);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get product by ID with variants" })
  @ApiParam({ name: "id", type: Number })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getProductById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a product" })
  @ApiBody({ type: CreateProductDto })
  create(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateProductDto })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", type: Number })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.deleteProduct(id);
  }

  @Public()
  @Get(":id/variants")
  @ApiOperation({ summary: "Get all variants for a product" })
  @ApiParam({ name: "id", type: Number })
  getVariants(@Param("id", ParseIntPipe) id: number) {
    return this.service.getVariantsByProduct(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTS
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Variants")
@Controller("variants")
export class VariantController {
  constructor(private readonly service: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a product variant" })
  @ApiBody({ type: CreateVariantDto })
  create(@Body() dto: CreateVariantDto) {
    return this.service.createVariant(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a product variant" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateVariantDto })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateVariantDto) {
    return this.service.updateVariant(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a product variant" })
  @ApiParam({ name: "id", type: Number })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.deleteVariant(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT LOOKUP (Frontend APIs)
// ─────────────────────────────────────────────────────────────────────────────
@Public()
@ApiTags("Product Lookup")
@Controller("product")
export class ProductLookupController2 {
  constructor(private readonly service: ProductService) {}

  @Post("variant")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get product variants by product ID" })
  @ApiBody({ type: ProductIdDto })
  getVariants(@Body() dto: ProductIdDto) {
    return this.service.getVariantsByProductId(dto.productId);
  }

  @Post("specification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get product specification and description" })
  @ApiBody({ type: ProductIdDto })
  getSpecification(@Body() dto: ProductIdDto) {
    return this.service.getSpecification(dto.productId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Customers")
@Controller("customers")
export class CustomerController {
  constructor(private readonly service: ProductService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new customer" })
  @ApiBody({ type: CreateCustomerDto })
  register(@Body() dto: CreateCustomerDto) {
    return this.service.registerCustomer(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Customer login" })
  @ApiBody({ type: CustomerLoginDto })
  login(@Body() dto: CustomerLoginDto) {
    return this.service.loginCustomer(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer by ID" })
  @ApiParam({ name: "id", type: Number })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getCustomerById(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Cart")
@Controller("cart")
export class CartController {
  constructor(private readonly service: ProductService) {}

  @Get(":customerId")
  @ApiOperation({ summary: "Get cart for a customer" })
  @ApiParam({ name: "customerId", type: Number })
  getCart(@Param("customerId", ParseIntPipe) customerId: number) {
    return this.service.getCart(customerId);
  }

  @Post("add")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add item to cart" })
  @ApiBody({ type: AddToCartDto })
  addToCart(@Body() dto: AddToCartDto) {
    return this.service.addToCart(dto);
  }

  @Put("update")
  @ApiOperation({ summary: "Update cart item quantity" })
  @ApiBody({ type: UpdateCartItemDto })
  updateCart(@Body() dto: UpdateCartItemDto) {
    return this.service.updateCartItem(dto);
  }

  @Delete("remove/:cartItemId")
  @ApiOperation({ summary: "Remove item from cart" })
  @ApiParam({ name: "cartItemId", type: Number })
  removeFromCart(@Param("cartItemId", ParseIntPipe) cartItemId: number) {
    return this.service.removeCartItem(cartItemId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Orders")
@Controller("orders")
export class OrderController {
  constructor(private readonly service: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create order from cart" })
  @ApiBody({ type: CreateOrderDto })
  create(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all orders (optionally filter by customerId)" })
  @ApiQuery({ name: "customerId", required: false, type: Number })
  getAll(@Query("customerId") customerId?: string) {
    return this.service.getOrders(
      customerId ? parseInt(customerId) : undefined,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order by ID" })
  @ApiParam({ name: "id", type: Number })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOrderById(id);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateOrderStatusDto })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateOrderStatus(id, dto);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────
@ApiBearerAuth()
@ApiTags("Payments")
@Controller("payments")
export class PaymentController {
  constructor(private readonly service: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a payment for an order" })
  @ApiBody({ type: CreatePaymentDto })
  create(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Get payments by order ID" })
  @ApiParam({ name: "orderId", type: Number })
  getByOrder(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.service.getPaymentsByOrder(orderId);
  }
}
