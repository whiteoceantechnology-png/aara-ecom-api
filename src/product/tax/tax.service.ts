import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tax.findMany({
      orderBy: { id: "asc" },
    });
  }

  create(dto: { name: string; percent: number }) {
    return this.prisma.tax.create({
      data: {
        name: dto.name.trim(),
        percent: dto.percent,
      },
    });
  }
}
