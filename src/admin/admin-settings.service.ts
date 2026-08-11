import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminUpdateNotificationSettingsDto,
  AdminUpdateStoreProfileDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificationSettings() {
    return this.ensureNotificationSettings();
  }

  async updateNotificationSettings(dto: AdminUpdateNotificationSettingsDto) {
    await this.ensureNotificationSettings();
    return this.prisma.notificationSettings.update({
      where: { id: 1 },
      data: {
        ...(dto.orderPlacedEmail !== undefined && {
          orderPlacedEmail: dto.orderPlacedEmail,
        }),
        ...(dto.orderShippedEmail !== undefined && {
          orderShippedEmail: dto.orderShippedEmail,
        }),
        ...(dto.orderDeliveredEmail !== undefined && {
          orderDeliveredEmail: dto.orderDeliveredEmail,
        }),
        ...(dto.lowStockAlert !== undefined && {
          lowStockAlert: dto.lowStockAlert,
        }),
        ...(dto.lowStockThreshold !== undefined && {
          lowStockThreshold: dto.lowStockThreshold,
        }),
        ...(dto.adminEmail !== undefined && { adminEmail: dto.adminEmail }),
      },
    });
  }

  async getStoreProfile() {
    return this.ensureStoreProfile();
  }

  async updateStoreProfile(dto: AdminUpdateStoreProfileDto) {
    await this.ensureStoreProfile();
    return this.prisma.storeProfile.update({
      where: { id: 1 },
      data: {
        ...(dto.storeName !== undefined && { storeName: dto.storeName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.addressLine1 !== undefined && {
          addressLine1: dto.addressLine1,
        }),
        ...(dto.addressLine2 !== undefined && {
          addressLine2: dto.addressLine2,
        }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });
  }

  private async ensureNotificationSettings() {
    const existing = await this.prisma.notificationSettings.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.prisma.notificationSettings.create({ data: { id: 1 } });
  }

  private async ensureStoreProfile() {
    const existing = await this.prisma.storeProfile.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.prisma.storeProfile.create({ data: { id: 1 } });
  }
}
