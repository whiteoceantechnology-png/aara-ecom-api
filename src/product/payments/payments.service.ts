import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { assertSelfOrAdmin, type AuthPrincipal } from "../../auth/principal";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 404 when the order is missing; 403 unless the caller owns it or is an admin. */
  async assertOrderAccess(orderId: number, principal: AuthPrincipal) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    assertSelfOrAdmin(principal, "customerId", order.customerId);
  }

  async assertPaymentAccess(paymentId: number, principal: AuthPrincipal) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { orderId: true },
    });
    if (!payment)
      throw new NotFoundException(`Payment #${paymentId} not found`);
    await this.assertOrderAccess(payment.orderId, principal);
  }

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
