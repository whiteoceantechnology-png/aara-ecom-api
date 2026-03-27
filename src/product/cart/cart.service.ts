import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AddToCartDto, UpdateCartItemDto } from "../dto/cart.dto";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          packSize: true,
          product: { select: { id: true, name: true, taxPercent: true } },
        },
      },
    },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(customerId: number) {
    let cart = await this.prisma.cart.findFirst({
      where: { customerId },
      include: cartInclude,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerId },
        include: cartInclude,
      });
    }
    return cart;
  }

  async addItem(dto: AddToCartDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant)
      throw new NotFoundException(`Variant #${dto.variantId} not found`);

    if (variant.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for variant #${dto.variantId}. Available: ${variant.stockQuantity}`,
      );
    }

    const cart = await this.getOrCreate(dto.customerId);

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: dto.variantId },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: dto.variantId,
        productId: variant.productId,
        quantity: dto.quantity,
        price: variant.price,
      },
    });
  }

  async updateItem(dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: dto.cartItemId },
    });
    if (!item)
      throw new NotFoundException(`Cart item #${dto.cartItemId} not found`);
    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: dto.cartItemId } });
      return { message: "Cart item removed" };
    }
    return this.prisma.cartItem.update({
      where: { id: dto.cartItemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(cartItemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });
    if (!item)
      throw new NotFoundException(`Cart item #${cartItemId} not found`);
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: "Item removed from cart" };
  }
}
