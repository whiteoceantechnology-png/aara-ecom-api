import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddressDto, UpdateAddressDto } from "./dto/user.dto";

const addressSelect = {
  id: true,
  firstName: true,
  lastName: true,
  houseNo: true,
  areaStreet: true,
  city: true,
  state: true,
  pincode: true,
  country: true,
  isDefault: true,
};

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName: true,
        emailAddress: true,
        birthDate: true,
      },
    });
    if (!profile) throw new NotFoundException("User profile not found");
    return profile;
  }

  // ─── Addresses ─────────────────────────────────────────────────────────────

  getAddresses(userId: number) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: { isDefault: "desc" },
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    // If new address is default, unset any existing default
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        houseNo: dto.houseNo,
        areaStreet: dto.areaStreet,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country,
        isDefault: dto.isDefault ?? false,
      },
      select: addressSelect,
    });
  }

  async updateAddress(
    userId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException("Address not found");

    // If updating to default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.update({
      where: { id: addressId },
      data: dto,
      select: addressSelect,
    });
  }

  async removeAddress(userId: number, addressId: number) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException("Address not found");

    await this.prisma.userAddress.delete({ where: { id: addressId } });
    return { message: "Address removed successfully" };
  }
}
