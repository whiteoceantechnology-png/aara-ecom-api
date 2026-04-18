import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { paymentDate: "desc" },
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment #${id} not found`);
    return payment;
  }
}
