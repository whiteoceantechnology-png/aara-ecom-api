import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateCustomerDto,
  CustomerLoginDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from "../dto/customer.dto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email already registered");
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
    if (!customer) throw new UnauthorizedException("Invalid credentials");
    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");
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

  getMe(customerId: number) {
    return this.findOne(customerId);
  }

  listAddresses(customerId: number) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: { id: "desc" },
    });
  }

  createAddress(customerId: number, dto: CreateCustomerAddressDto) {
    return this.prisma.customerAddress.create({
      data: {
        customerId,
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
      },
    });
  }

  async updateAddress(
    customerId: number,
    addressId: number,
    dto: UpdateCustomerAddressDto,
  ) {
    await this.ensureAddressOwned(customerId, addressId);
    const data: Prisma.CustomerAddressUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.country !== undefined) data.country = dto.country;
    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });
  }

  async removeAddress(customerId: number, addressId: number) {
    await this.ensureAddressOwned(customerId, addressId);
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    return { message: "Address deleted" };
  }

  private async ensureAddressOwned(customerId: number, addressId: number) {
    const addr = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!addr) {
      throw new NotFoundException(
        `Shipping address #${addressId} not found for this customer`,
      );
    }
    return addr;
  }
}
