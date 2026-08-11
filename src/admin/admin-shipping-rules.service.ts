import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminShippingRuleDto,
  AdminUpdateShippingRuleDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminShippingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.shippingRule.findMany({
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });
  }

  create(dto: AdminShippingRuleDto) {
    return this.prisma.shippingRule.create({
      data: {
        name: dto.name,
        minOrderAmount: dto.minOrderAmount ?? null,
        maxOrderAmount: dto.maxOrderAmount ?? null,
        shippingAmount: dto.shippingAmount,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      },
    });
  }

  async update(id: number, dto: AdminUpdateShippingRuleDto) {
    await this.ensureExists(id);
    const data: Prisma.ShippingRuleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.minOrderAmount !== undefined)
      data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxOrderAmount !== undefined)
      data.maxOrderAmount = dto.maxOrderAmount;
    if (dto.shippingAmount !== undefined)
      data.shippingAmount = dto.shippingAmount;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.priority !== undefined) data.priority = dto.priority;
    return this.prisma.shippingRule.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.shippingRule.delete({ where: { id } });
    return { message: "Shipping rule deleted" };
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.shippingRule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Shipping rule ${id} not found`);
  }
}
