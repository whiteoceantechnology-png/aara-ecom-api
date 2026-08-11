import {
  Controller,
  Get,
  Post,
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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { WishlistService } from "./wishlist.service";
import { AddToWishlistDto, WishlistQueryDto } from "../dto/wishlist.dto";
import { CurrentCustomerId } from "../decorators/current-customer.decorator";

@ApiBearerAuth()
@ApiTags("Wishlist")
@Controller("wishlist")
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Add a product to the wishlist (idempotent)",
    description: "Requires customer JWT from `POST /customers/login`.",
  })
  @ApiBody({ type: AddToWishlistDto })
  @ApiResponse({
    status: 200,
    description: "Added or already present",
    schema: { example: { message: "Product added to wishlist" } },
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  add(@CurrentCustomerId() customerId: number, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.add(customerId, dto.productId);
  }

  @Get()
  @ApiOperation({ summary: "List wishlist products for the current customer" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: "Paginated wishlist items" })
  findAll(
    @CurrentCustomerId() customerId: number,
    @Query() query: WishlistQueryDto,
  ) {
    return this.wishlistService.list(
      customerId,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Delete(":productId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a product from the wishlist" })
  @ApiParam({ name: "productId", type: Number })
  @ApiResponse({ status: 200, description: "Removed" })
  @ApiResponse({ status: 404, description: "Not in wishlist" })
  remove(
    @CurrentCustomerId() customerId: number,
    @Param("productId", ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.remove(customerId, productId);
  }
}
