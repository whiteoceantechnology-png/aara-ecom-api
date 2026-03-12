import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminCustomerFilterDto } from "./dto/admin.dto";

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: AdminCustomerFilterDto) {
    return this.prisma.customer.findMany({
      where: {
        ...(filter.search && {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { email: { contains: filter.search, mode: "insensitive" } },
            { phone: { contains: filter.search, mode: "insensitive" } },
          ],
        }),
        ...(filter.isBlocked !== undefined && { isBlocked: filter.isBlocked }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isBlocked: true,
        createdAt: true,
        addresses: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) throw new NotFoundException(`Customer #${id} not found`);

    const totalSpent = customer.orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const lastOrder = customer.orders[0] ?? null;

    return {
      ...customer,
      totalSpent,
      lastOrderDate: lastOrder?.createdAt ?? null,
    };
  }

  async toggleBlock(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer #${id} not found`);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { isBlocked: !customer.isBlocked },
      select: { id: true, name: true, email: true, isBlocked: true },
    });

    return {
      ...updated,
      message: updated.isBlocked ? "Customer blocked" : "Customer unblocked",
    };
  }
}
