import { Injectable } from "@nestjs/common";
import { ProductRepository } from "./product.repository";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from "./dto/product.dto";
import { CreateVariantDto, UpdateVariantDto } from "./dto/variant.dto";
import { CreateCustomerDto, CustomerLoginDto } from "./dto/customer.dto";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CreatePaymentDto,
} from "./dto/order.dto";

@Injectable()
export class ProductService {
  constructor(private readonly repo: ProductRepository) {}

  // Categories
  getCategories() {
    return this.repo.getCategories();
  }
  getCategoryById(id: number) {
    return this.repo.getCategoryById(id);
  }
  getCategoryProducts(categoryId: number) {
    return this.repo.getCategoryProducts(categoryId);
  }
  createCategory(dto: CreateCategoryDto) {
    return this.repo.createCategory(dto);
  }
  updateCategory(id: number, dto: UpdateCategoryDto) {
    return this.repo.updateCategory(id, dto);
  }
  deleteCategory(id: number) {
    return this.repo.deleteCategory(id);
  }

  // Products
  getProducts(filter: ProductFilterDto) {
    return this.repo.getProducts(filter);
  }
  getProductById(id: number) {
    return this.repo.getProductById(id);
  }
  createProduct(dto: CreateProductDto) {
    return this.repo.createProduct(dto);
  }
  updateProduct(id: number, dto: UpdateProductDto) {
    return this.repo.updateProduct(id, dto);
  }
  deleteProduct(id: number) {
    return this.repo.deleteProduct(id);
  }

  // Variants
  getVariantsByProduct(productId: number) {
    return this.repo.getVariantsByProduct(productId);
  }
  getVariantsByProductId(productId: number) {
    return this.repo.getVariantsByProductId(productId);
  }
  getSpecification(productId: number) {
    return this.repo.getSpecification(productId);
  }
  createVariant(dto: CreateVariantDto) {
    return this.repo.createVariant(dto);
  }
  updateVariant(id: number, dto: UpdateVariantDto) {
    return this.repo.updateVariant(id, dto);
  }
  deleteVariant(id: number) {
    return this.repo.deleteVariant(id);
  }

  // Customers
  registerCustomer(dto: CreateCustomerDto) {
    return this.repo.registerCustomer(dto);
  }
  loginCustomer(dto: CustomerLoginDto) {
    return this.repo.loginCustomer(dto);
  }
  getCustomerById(id: number) {
    return this.repo.getCustomerById(id);
  }

  // Cart
  getCart(customerId: number) {
    return this.repo.getOrCreateCart(customerId);
  }
  addToCart(customerId: number, dto: AddToCartDto) {
    return this.repo.addToCart(customerId, dto);
  }
  updateCartItem(dto: UpdateCartItemDto) {
    return this.repo.updateCartItem(dto);
  }
  removeCartItem(cartItemId: number) {
    return this.repo.removeCartItem(cartItemId);
  }

  // Orders
  createOrder(dto: CreateOrderDto) {
    return this.repo.createOrder(dto);
  }
  getOrders(customerId?: number) {
    return this.repo.getOrders(customerId);
  }
  getOrderById(id: number) {
    return this.repo.getOrderById(id);
  }
  updateOrderStatus(id: number, dto: UpdateOrderStatusDto) {
    return this.repo.updateOrderStatus(id, dto.status);
  }

  // Payments
  createPayment(dto: CreatePaymentDto) {
    return this.repo.createPayment(dto);
  }
  getPaymentsByOrder(orderId: number) {
    return this.repo.getPaymentsByOrder(orderId);
  }
}
