import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: {
        items: {
          include: {
            variant: { include: { packSize: true, product: true } },
          },
        },
      },
    });

    if (!cart || cart.customerId !== dto.customerId) {
      throw new NotFoundException('Cart not found');
    }
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const orderNumber = `ORD-${Date.now()}`;
    let total = 0;

    const orderItems = cart.items.map((item) => {
      const subtotal = Number(item.price) * item.quantity;
      total += subtotal;
      return {
        variantId: item.variantId,
        productName: item.variant.product.name,
        sizeLabel: item.variant.packSize.label,
        price: item.price,
        quantity: item.quantity,
        subtotal,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        customerId: dto.customerId,
        orderNumber,
        totalAmount: total,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  findAll(customerId?: number) {
    return this.prisma.order.findMany({
      where: customerId ? { customerId } : {},
      include: { items: true, payments: true, shipments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, shipments: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async updateStatus(id: number, status: string) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
