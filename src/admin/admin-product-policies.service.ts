import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProductPoliciesDto } from "./dto/admin.dto";

@Injectable()
export class AdminProductPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.productPolicies.findUnique({
      where: { id: 1 },
    });
    if (!row) {
      throw new NotFoundException("Product policies not found");
    }
    return row.policies;
  }

  async create(dto: UpsertProductPoliciesDto) {
    const existing = await this.prisma.productPolicies.findUnique({
      where: { id: 1 },
    });
    if (existing) {
      throw new ConflictException(
        "Product policies already exist. Use PUT to update.",
      );
    }
    await this.prisma.productPolicies.create({
      data: {
        id: 1,
        policies: dto as unknown as Prisma.InputJsonValue,
      },
    });
    return { message: "Product Policies updated successfully" };
  }

  async update(dto: UpsertProductPoliciesDto) {
    await this.ensureExists();
    await this.prisma.productPolicies.update({
      where: { id: 1 },
      data: { policies: dto as unknown as Prisma.InputJsonValue },
    });
    return { message: "Product Policies updated successfully" };
  }

  async remove() {
    await this.ensureExists();
    await this.prisma.productPolicies.delete({ where: { id: 1 } });
    return { message: "Product Policies deleted successfully" };
  }

  private async ensureExists() {
    const existing = await this.prisma.productPolicies.findUnique({
      where: { id: 1 },
    });
    if (!existing) {
      throw new NotFoundException("Product policies not found");
    }
    return existing;
  }
}
