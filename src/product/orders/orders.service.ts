import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "../dto/order.dto";
import { AdminUpdateOrderDto } from "../../admin/dto/admin.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

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
      throw new NotFoundException("Cart not found");
    }
    if (cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
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
      orderBy: { createdAt: "desc" },
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

  // ─── Admin ───────────────────────────────────────────────────────────────────

  adminFindAll(params: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const { status, paymentStatus, search, from, to } = params;
    return this.prisma.order.findMany({
      where: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(search && {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { email: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: true,
        payments: {
          select: {
            paymentMethod: true,
            paymentStatus: true,
            paymentDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async adminFindOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: { include: { variant: { include: { packSize: true } } } },
        payments: true,
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async adminUpdate(id: number, dto: AdminUpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
    });
  }

  async adminExportCsv(params: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const orders = await this.adminFindAll(params);

    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Status",
      "Payment Status",
      "Total Amount",
      "Tax Amount",
      "Shipping Amount",
      "Tracking ID",
      "Notes",
      "Created At",
    ].join(",");

    const rows = orders.map((o) =>
      [
        o.orderNumber,
        `"${o.customer.name}"`,
        o.customer.email,
        o.customer.phone ?? "",
        o.status,
        o.paymentStatus,
        o.totalAmount,
        o.taxAmount,
        o.shippingAmount,
        o.trackingId ?? "",
        `"${(o.notes ?? "").replace(/"/g, '""')}"`,
        o.createdAt.toISOString(),
      ].join(","),
    );

    return [headers, ...rows].join("\n");
  }
}
