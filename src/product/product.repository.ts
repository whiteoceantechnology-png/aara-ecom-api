import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { stringContainsFilter } from "../common/database-provider.util";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "./dto/product.dto";
import { CreateVariantDto, UpdateVariantDto } from "./dto/variant.dto";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import { CreateOrderDto, CreatePaymentDto } from "./dto/order.dto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { CreateCustomerDto, CustomerLoginDto } from "./dto/customer.dto";
import { toImageUrl, toImageUrls } from "../common/image-url";
import { serializeProductVariantForApi } from "./utils/variant-api.util";

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categories ────────────────────────────────────────────────────────────

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        categoryImage: true,
      },
    });
    return {
      status: true,
      data: categories.map((c) => ({
        id: c.id,
        categoryName: c.name,
        categoryImage: c.categoryImage ?? null,
      })),
    };
  }

  async getCategoryById(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException("Category not found");
    return cat;
  }

  async getCategoryProducts(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException("Category not found");

    const products = await this.prisma.product.findMany({
      where: { categoryId, status: true },
      select: {
        id: true,
        categoryId: true,
        name: true,
        productImage: true,
        actualPrice: true,
        discountPrice: true,
        category: { select: { name: true } },
      },
      orderBy: { id: "asc" },
    });

    return {
      data: products.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        productName: p.name,
        productImage: toImageUrl(p.productImage),
        actualPrice: p.actualPrice ? Number(p.actualPrice) : null,
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      })),
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        ...(dto.categoryImage != null && { categoryImage: dto.categoryImage }),
      },
    });
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    await this.getCategoryById(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: number) {
    await this.getCategoryById(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: "Category deleted successfully" };
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async getProducts(filter: ProductFilterDto) {
    return await this.prisma.product.findMany({
      where: {
        ...(filter.category ? { categoryId: filter.category } : {}),
        ...(filter.search ? { name: stringContainsFilter(filter.search) } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { status: true },
          select: {
            id: true,
            sku: true,
            price: true,
            status: true,
            packSize: { select: { label: true } },
          },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
      orderBy: { id: "asc" },
    });
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { status: true },
          include: { packSize: { select: { label: true } } },
        },
        images: { select: { id: true, imageUrl: true, isPrimary: true } },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category)
      throw new NotFoundException(`Category #${dto.categoryId} not found`);

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        hsnCode: dto.hsnCode,
        taxPercent: dto.taxPercent ?? 0,
        status: dto.status ?? true,
      },
    });
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.getProductById(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async deleteProduct(id: number) {
    await this.getProductById(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: "Product deleted successfully" };
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async getVariantsByProduct(productId: number) {
    await this.getProductById(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: { packSize: true },
      orderBy: { packSize: { size: "asc" } },
    });
  }

  async getVariantsByProductId(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, reservedStock: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    const variants = await this.prisma.productVariant.findMany({
      where: { productId, status: true },
      include: {
        images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { id: "asc" },
    });

    const availableStock = Math.max(0, product.stock - product.reservedStock);

    return variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productName: product.name,
      variantName: v.variantName,
      variantImage: toImageUrls(v.images.map((img) => img.imageUrl)),
      variantColor: v.variantColor,
      isColor: v.isColor,
      actualPrice: v.actualPrice ? Number(v.actualPrice) : Number(v.price),
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      altTags: v.altTags,
      availableStock,
      favourites: v.favourites,
    }));
  }

  async getSpecification(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        description: true,
        category: { select: { name: true } },
      },
    });
    if (!product) throw new NotFoundException("Product not found");

    const spec = await this.prisma.productSpecification.findUnique({
      where: { productId },
    });

    return {
      specification: spec
        ? {
            id: spec.id,
            productId: spec.productId,
            productSpecification: spec.productSpecification,
          }
        : null,
      description: {
        shortDescription: spec?.shortDescription ?? null,
        longDescription:
          spec?.productDescription ?? product.description ?? null,
        moreInfoHtml: spec?.moreInfo ?? null,
        categoryName: product.category.name,
      },
    };
  }

  async createVariant(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product)
      throw new NotFoundException(`Product #${dto.productId} not found`);

    const packSize = await this.prisma.packSize.findUnique({
      where: { id: dto.packSizeId },
    });
    if (!packSize) {
      const count = await this.prisma.packSize.count();
      const suffix =
        count === 0
          ? " Seed pack sizes first: `npm run db:seed`. Then GET /variants lists valid IDs."
          : " Use GET /variants to see valid packSizeId values (create variants via POST /admin/variants).";
      throw new NotFoundException(
        `PackSize #${dto.packSizeId} not found.${suffix}`,
      );
    }

    const created = await this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        packSizeId: dto.packSizeId,
        price: dto.price,
        actualPrice: product.actualPrice,
        discountPrice: product.discountPrice,
        sku: dto.sku,
        status: dto.status ?? true,
      },
      include: {
        packSize: true,
        product: { select: { id: true, name: true } },
      },
    });
    return serializeProductVariantForApi(created);
  }

  async updateVariant(id: number, dto: UpdateVariantDto) {
    const v = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!v) throw new NotFoundException("Variant not found");
    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: dto,
      include: {
        packSize: true,
        product: { select: { id: true, name: true } },
      },
    });
    return serializeProductVariantForApi(updated);
  }

  async deleteVariant(id: number) {
    const v = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!v) throw new NotFoundException("Variant not found");
    await this.prisma.productVariant.delete({ where: { id } });
    return { message: "Variant deleted successfully" };
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async registerCustomer(dto: CreateCustomerDto) {
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

  async loginCustomer(dto: CustomerLoginDto) {
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

  async getCustomerById(id: number) {
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
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  // ─── Cart ──────────────────────────────────────────────────────────────────

  async getOrCreateCart(customerId: number) {
    let cart = await this.prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: { include: { packSize: true } },
            product: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerId },
        include: {
          items: {
            include: {
              variant: { include: { packSize: true } },
              product: { select: { id: true, name: true } },
            },
          },
        },
      });
    }
    return cart;
  }

  async addToCart(customerId: number, dto: AddToCartDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        product: { select: { stock: true, reservedStock: true } },
      },
    });
    if (!variant) throw new NotFoundException("Variant not found");

    const available = Math.max(
      0,
      variant.product.stock - variant.product.reservedStock,
    );
    if (available < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for variant #${dto.variantId}. Available: ${available}`,
      );
    }

    const cart = await this.getOrCreateCart(customerId);

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: dto.variantId },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: dto.variantId,
        productId: variant.productId,
        quantity: dto.quantity,
        price: variant.price,
      },
    });
  }

  async updateCartItem(dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: dto.cartItemId },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: dto.cartItemId } });
      return { message: "Cart item removed" };
    }
    return this.prisma.cartItem.update({
      where: { id: dto.cartItemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeCartItem(cartItemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: "Item removed from cart" };
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  async createOrder(dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: {
        items: {
          include: { variant: { include: { packSize: true, product: true } } },
        },
      },
    });
    if (!cart || cart.customerId !== dto.customerId)
      throw new NotFoundException("Cart not found");
    if (cart.items.length === 0) throw new BadRequestException("Cart is empty");

    // Validate stock availability (product pool)
    const outOfStock = cart.items.filter((item) => {
      const available = Math.max(
        0,
        item.variant.product.stock - item.variant.product.reservedStock,
      );
      return available < item.quantity;
    });
    if (outOfStock.length > 0) {
      const details = outOfStock.map((item) => {
        const available = Math.max(
          0,
          item.variant.product.stock - item.variant.product.reservedStock,
        );
        return `${item.variant.product.name} (requested: ${item.quantity}, available: ${available})`;
      });
      throw new BadRequestException(
        `Insufficient stock for: ${details.join("; ")}`,
      );
    }

    const orderNumber = `ORD-${Date.now()}`;
    let total = 0;
    const orderItems = cart.items.map((item) => {
      const subtotal = Number(item.price) * item.quantity;
      total += subtotal;
      return {
        variantId: item.variantId,
        productName: item.variant.product.name,
        sizeLabel: item.variant.packSize.label,
        price: item.price,
        quantity: item.quantity,
        subtotal,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        customerId: dto.customerId,
        orderNumber,
        totalAmount: total,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Deduct product-pool stock
    await Promise.all(
      cart.items.map((item) =>
        this.prisma.product.update({
          where: { id: item.variant.productId },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    );

    // Clear the cart
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  async getOrders(customerId?: number) {
    return await this.prisma.order.findMany({
      where: customerId ? { customerId } : {},
      include: { items: true, payments: true, shipments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, shipments: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async updateOrderStatus(id: number, status: string) {
    await this.getOrderById(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  async createPayment(dto: CreatePaymentDto) {
    await this.getOrderById(dto.orderId);
    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        paymentMethod: dto.paymentMethod,
        transactionId: dto.transactionId,
        paymentStatus: "success",
      },
    });
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { paymentStatus: "paid" },
    });
    return payment;
  }

  async getPaymentsByOrder(orderId: number) {
    await this.getOrderById(orderId);
    return this.prisma.payment.findMany({ where: { orderId } });
  }
}
