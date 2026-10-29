import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MetaCapiService } from "../../common/meta-capi/meta-capi.service";
import { AddToCartDto, UpdateCartItemDto } from "../dto/cart.dto";
import {
  unitsToConsume,
  poolAvailableInBase,
} from "../products/product-stock-pool.util";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          packSize: true,
          product: {
            select: {
              id: true,
              name: true,
              taxPercent: true,
              stock: true,
              reservedStock: true,
              stockUnit: true,
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaCapi: MetaCapiService,
  ) {}

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

  async addItem(
    customerId: number,
    dto: AddToCartDto,
    clientUserAgent?: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        packSize: true,
        product: {
          select: {
            id: true,
            stock: true,
            reservedStock: true,
            stockUnit: true,
          },
        },
      },
    });
    if (!variant)
      throw new NotFoundException(`Variant #${dto.variantId} not found`);

    const cart = await this.getOrCreate(customerId);
    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: dto.variantId },
    });
    const nextQty = (existing?.quantity ?? 0) + dto.quantity;

    // Sum units already in cart for this product (shared pool).
    const sameProductItems = cart.items.filter(
      (i) => i.variant.product.id === variant.productId,
    );
    let unitsNeeded = 0;
    for (const i of sameProductItems) {
      const qty = i.variantId === dto.variantId ? nextQty : i.quantity;
      unitsNeeded += unitsToConsume({
        quantity: qty,
        stockUnit: variant.product.stockUnit,
        packSize: i.variant.packSize,
        variantName: i.variant.variantName,
      });
    }
    if (!sameProductItems.some((i) => i.variantId === dto.variantId)) {
      unitsNeeded += unitsToConsume({
        quantity: dto.quantity,
        stockUnit: variant.product.stockUnit,
        packSize: variant.packSize,
        variantName: variant.variantName,
      });
    }

    const sellable = poolAvailableInBase(
      variant.product.stock,
      variant.product.reservedStock,
      variant.product.stockUnit,
    );
    if (unitsNeeded > sellable) {
      throw new BadRequestException(
        `Insufficient stock for product #${variant.productId}. Need ${unitsNeeded}, available ${sellable}` +
          (variant.product.stockUnit
            ? ` (${variant.product.stockUnit} pool)`
            : ""),
      );
    }

    const item = existing
      ? await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        })
      : await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: dto.variantId,
            productId: variant.productId,
            quantity: dto.quantity,
            price: variant.price,
          },
        });

    void this.trackAddToCart(
      customerId,
      dto,
      Number(variant.price),
      clientUserAgent,
    );
    return item;
  }

  /**
   * Server-side Meta AddToCart event, deduplicated against the browser Pixel by
   * `metaEventId`. Fire-and-forget so Meta latency never slows the cart response.
   */
  private async trackAddToCart(
    customerId: number,
    dto: AddToCartDto,
    unitPrice: number,
    clientUserAgent?: string,
  ) {
    if (!dto.metaEventId) return;
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, email: true, phone: true },
      });
      const [firstName, ...lastNameParts] = (customer?.name ?? "")
        .trim()
        .split(/\s+/);

      await this.metaCapi.sendAddToCartEvent({
        eventId: dto.metaEventId,
        eventTime: Math.floor(Date.now() / 1000),
        value: unitPrice * dto.quantity,
        currency: "INR",
        numItems: dto.quantity,
        contentIds: [String(dto.variantId)],
        contents: [
          {
            id: String(dto.variantId),
            quantity: dto.quantity,
            item_price: unitPrice,
          },
        ],
        email: customer?.email ?? null,
        phone: customer?.phone ?? null,
        firstName: firstName || null,
        lastName: lastNameParts.join(" ") || null,
        clientUserAgent: clientUserAgent ?? null,
        fbp: dto.fbp ?? null,
        fbc: dto.fbc ?? null,
        eventSourceUrl: dto.eventSourceUrl ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Meta AddToCart tracking failed for customer #${customerId}: ${String(err)}`,
      );
    }
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
