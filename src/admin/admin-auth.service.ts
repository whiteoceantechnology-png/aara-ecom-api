import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminLoginDto, CreateAdminDto } from "./dto/admin-auth.dto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreateAdminDto) {
    const existing = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new ConflictException("Admin username already exists");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = await this.prisma.admin.create({
      data: { username: dto.username, password: passwordHash },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    return admin;
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });
    if (!admin) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const token = jwt.sign(
      { sub: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET ?? "secret",
      { expiresIn: "8h" },
    );

    return {
      token,
      admin: { id: admin.id, username: admin.username, role: admin.role },
    };
  }
}
