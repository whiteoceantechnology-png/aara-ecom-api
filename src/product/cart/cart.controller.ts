import {
  Controller, Get, Post, Put, Delete,
  Body, Param, HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from '../dto/cart.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':customerId')
  @ApiOperation({ summary: 'Get or create cart for a customer' })
  @ApiParam({ name: 'customerId', type: Number })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  getCart(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.cartService.getOrCreate(customerId);
  }

  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to cart (auto-increments qty if variant already in cart)' })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  addItem(@Body() dto: AddToCartDto) {
    return this.cartService.addItem(dto);
  }

  @Put('update')
  @ApiOperation({ summary: 'Update cart item quantity (set 0 to remove)' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateItem(@Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(dto);
  }

  @Delete('remove/:cartItemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'cartItemId', type: Number })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeItem(@Param('cartItemId', ParseIntPipe) cartItemId: number) {
    return this.cartService.removeItem(cartItemId);
  }
}
