import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePaymentDto } from "../dto/order.dto";
import { OrdersService } from "../orders/orders.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async create(dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException(`Order #${dto.orderId} not found`);
    if (order.paymentStatus === "paid") {
      throw new BadRequestException("Order is already paid");
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        paymentMethod: dto.paymentMethod,
        transactionId: dto.transactionId,
        paymentStatus: "paid",
        paymentDate: new Date(),
      },
    });

    await this.ordersService.applyPaymentSuccess(dto.orderId);

    return payment;
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
