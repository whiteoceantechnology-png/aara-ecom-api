import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { stringContainsFilter } from "../common/database-provider.util";

const ALLOWED_TYPES = ["products", "orders", "customers"] as const;
type SearchType = (typeof ALLOWED_TYPES)[number];

@Injectable()
export class AdminSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q?: string, typesRaw?: string) {
    const query = (q || "").trim();
    if (query.length < 1) {
      throw new BadRequestException("q is required");
    }

    const types = this.parseTypes(typesRaw);
    const contains = stringContainsFilter(query);
    const take = 20;

    const [products, orders, customers] = await Promise.all([
      types.includes("products")
        ? this.prisma.product.findMany({
            where: { name: contains },
            take,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              status: true,
              productImage: true,
              categoryId: true,
            },
          })
        : Promise.resolve([]),
      types.includes("orders")
        ? this.prisma.order.findMany({
            where: {
              OR: [
                { orderNumber: contains },
                { customer: { name: contains } },
                { customer: { email: contains } },
              ],
            },
            take,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              createdAt: true,
              customer: { select: { id: true, name: true, email: true } },
            },
          })
        : Promise.resolve([]),
      types.includes("customers")
        ? this.prisma.customer.findMany({
            where: {
              OR: [
                { name: contains },
                { email: contains },
                { phone: contains },
              ],
            },
            take,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isBlocked: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      q: query,
      types,
      products,
      orders,
      customers,
      counts: {
        products: products.length,
        orders: orders.length,
        customers: customers.length,
      },
    };
  }

  private parseTypes(typesRaw?: string): SearchType[] {
    if (!typesRaw || !typesRaw.trim()) return [...ALLOWED_TYPES];
    const parts = typesRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const invalid = parts.filter(
      (t) => !ALLOWED_TYPES.includes(t as SearchType),
    );
    if (invalid.length) {
      throw new BadRequestException(
        `types must be comma-separated from: ${ALLOWED_TYPES.join(", ")}`,
      );
    }
    return [...new Set(parts)] as SearchType[];
  }
}
