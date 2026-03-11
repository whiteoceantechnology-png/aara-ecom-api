import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({ where: { resetToken: token } });
  }

  async createUser(username: string, hashedPassword: string) {
    return this.prisma.user.create({
      data: { username, password: hashedPassword },
      select: { id: true, username: true },
    });
  }

  async updateUser(id: number, data: { username?: string; password?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true },
    });
  }

  async setResetToken(id: number, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
  }

  async clearResetToken(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  }
}
