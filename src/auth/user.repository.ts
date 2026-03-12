import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByResetToken(token: string) {
    return this.prisma.user.findFirst({ where: { resetToken: token } });
  }

  createUser(
    username: string,
    hashedPassword: string,
    profile?: {
      firstName: string;
      lastName: string;
      emailAddress: string;
      birthDate: string;
    },
  ) {
    return this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        ...(profile && {
          profile: {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              emailAddress: profile.emailAddress,
              birthDate: profile.birthDate,
            },
          },
        }),
      },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            emailAddress: true,
            birthDate: true,
          },
        },
      },
    });
  }

  updateUser(id: number, data: { username?: string; password?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true },
    });
  }

  setResetToken(id: number, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
  }

  clearResetToken(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  }
}
