import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminUpdateOrderDto } from "./dto/admin.dto";

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const { status, paymentStatus, search, from, to } = params;

    return await this.prisma.order.findMany({
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

  async findOne(id: number) {
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

  async update(id: number, dto: AdminUpdateOrderDto) {
    await this.findOneOrFail(id);
    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
    });
  }

  async exportCsv(params: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const orders = await this.findAll(params);

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

  private async findOneOrFail(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }
}
