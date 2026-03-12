import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCustomerDto, CustomerLoginDto } from "../dto/customer.dto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async login(dto: CustomerLoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (!customer) throw new BadRequestException("Invalid credentials");
    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) throw new BadRequestException("Invalid credentials");
    const token = jwt.sign(
      { customerId: customer.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );
    return { token, customerId: customer.id, name: customer.name };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        addresses: true,
      },
    });
    if (!customer) throw new NotFoundException(`Customer #${id} not found`);
    return customer;
  }
}
