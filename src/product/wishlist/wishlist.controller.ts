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
import { CurrentUserId } from "../../user/decorators/current-user-id.decorator";

@ApiBearerAuth()
@ApiTags("Wishlist")
@Controller("wishlist")
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add a product to the wishlist (idempotent)" })
  @ApiBody({ type: AddToWishlistDto })
  @ApiResponse({
    status: 200,
    description: "Added or already present",
    schema: {
      example: { message: "Product added to wishlist" },
    },
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  add(@CurrentUserId() userId: number, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.add(userId, dto.productId);
  }

  @Get()
  @ApiOperation({ summary: "List wishlist products for the current customer" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: "Paginated wishlist items" })
  findAll(@CurrentUserId() userId: number, @Query() query: WishlistQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.wishlistService.list(userId, page, limit);
  }

  @Delete(":productId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a product from the wishlist" })
  @ApiParam({ name: "productId", type: Number })
  @ApiResponse({ status: 200, description: "Removed" })
  @ApiResponse({ status: 404, description: "Not in wishlist" })
  remove(
    @CurrentUserId() userId: number,
    @Param("productId", ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.remove(userId, productId);
  }
}
