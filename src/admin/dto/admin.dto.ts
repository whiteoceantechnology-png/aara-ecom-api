import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  IsObject,
  IsDefined,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";

// ─── Brand DTOs ───────────────────────────────────────────────────────────────

export class CreateBrandDto {
  @ApiProperty({ example: "Himalaya" })
  @IsString()
  name: string;

  @ApiProperty({ example: "himalaya" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/himalaya.png" })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: "Himalaya Wellness" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "himalaya-wellness" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/logo.png" })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Product Management DTOs ─────────────────────────────────────────────────

export class AdminCreateProductDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  categoryId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiProperty({ example: "Ashwagandha Root" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: "Premium quality ashwagandha root powder",
    description: "Product description (unlimited length)",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "12119029" })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({
    example: 1,
    description: "Tax master ID (GET /taxes)",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxId?: number;

  @ApiPropertyOptional({ example: 1333 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  actualPrice?: number;

  @ApiPropertyOptional({ example: 1239 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({ example: "https://cdn.example.com/product.jpg" })
  @IsOptional()
  @IsString()
  productImage?: string;
}

export class AdminUpdateProductDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ example: "Ashwagandha Powder" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: "Updated description",
    description: "Product description (unlimited length)",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "12119029" })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({
    example: 1,
    description: "Tax master ID (GET /taxes)",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: 1333 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  actualPrice?: number;

  @ApiPropertyOptional({ example: 1239 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({ example: "https://cdn.example.com/product.jpg" })
  @IsOptional()
  @IsString()
  productImage?: string;
}

export class AdminUpdateStockDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Type(() => Number)
  stockQuantity: number;
}

// ─── Inventory DTOs ──────────────────────────────────────────────────────────

export class AdminAdjustStockDto {
  @ApiProperty({
    example: -5,
    description: "Signed delta applied to on-hand stockQuantity",
  })
  @IsInt()
  @Type(() => Number)
  quantityChange: number;

  @ApiProperty({ example: "damaged" })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: "5 units damaged in transit" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminReserveStockDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ example: "order" })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: 234 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  referenceId?: number;
}

export class AdminReleaseStockDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ example: "order" })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: 234 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  referenceId?: number;
}

export class AdminBulkStockUpdateItemDto {
  @ApiProperty({ example: 45 })
  @IsInt()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Type(() => Number)
  stockQuantity: number;
}

export class AdminBulkStockUpdateDto {
  @ApiProperty({
    type: [AdminBulkStockUpdateItemDto],
    example: [
      { variantId: 45, stockQuantity: 120 },
      { variantId: 46, stockQuantity: 0 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminBulkStockUpdateItemDto)
  updates: AdminBulkStockUpdateItemDto[];
}

export class AdminAddImageDto {
  @ApiProperty({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description:
      "Image path from upload API (POST /admin/images/upload) or full URL",
  })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

// ─── Category DTOs ───────────────────────────────────────────────────────────

export class AdminCreateCategoryDto {
  @ApiProperty({
    example: "Raw Dried Herbs",
    description: "Same fields as storefront `POST /categories`.",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description: "Image path from upload API (POST /admin/images/upload)",
  })
  @IsOptional()
  @IsString()
  categoryImage?: string;
}

export class AdminUpdateCategoryDto {
  @ApiPropertyOptional({ example: "Dried Herbs" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description: "Image path from upload API (POST /admin/images/upload)",
  })
  @IsOptional()
  @IsString()
  categoryImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Order Management DTOs ───────────────────────────────────────────────────

export class AdminUpdateOrderDto {
  @ApiPropertyOptional({
    example: "PACKED",
    enum: [
      "PENDING_PAYMENT",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "FAILED",
    ],
    description: "Fulfillment status — validated against allowed transitions",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "TRK-987654321" })
  @IsOptional()
  @IsString()
  trackingId?: string;

  @ApiPropertyOptional({ example: "Packed successfully" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminRecordPaymentDto {
  @ApiPropertyOptional({
    example: 2450,
    description: "Defaults to order total",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: "cod", enum: ["cod", "cash", "offline"] })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: "2026-08-13T10:30:00Z" })
  @IsOptional()
  @IsString()
  receivedAt?: string;

  @ApiPropertyOptional({ example: "COD-001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: "Payment received from courier" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminUpdatePaymentStatusDto {
  @ApiProperty({
    example: "paid",
    enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
  })
  @IsString()
  paymentStatus: string;

  @ApiPropertyOptional({ example: "COD payment received" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminRefundOrderDto {
  @ApiProperty({ example: 2450 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: "Customer requested refund" })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    type: "array",
    description: "Optional item-level refund lines",
    example: [{ orderItemId: 1, quantity: 1 }],
  })
  @IsOptional()
  @IsArray()
  items?: Array<Record<string, unknown>>;
}

export class AdminCancelOrderDto {
  @ApiProperty({ example: "Customer requested cancellation" })
  @IsString()
  reason: string;
}

export class AdminContactCustomerDto {
  @ApiProperty({
    example: "email",
    enum: ["email", "sms", "whatsapp", "phone"],
  })
  @IsString()
  channel: string;

  @ApiProperty({ example: "Your order has been shipped." })
  @IsString()
  message: string;
}

export class AdminAutoDeliverDto {
  @ApiPropertyOptional({
    example: 7,
    description: "Mark SHIPPED → DELIVERED after this many days",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  daysAfterShip?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}

// ─── Customer Management DTOs ────────────────────────────────────────────────

export class AdminCustomerFilterDto {
  @ApiPropertyOptional({ example: "john" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBlocked?: boolean;
}

// ─── Specification DTOs ──────────────────────────────────────────────────────

export class SpecItemDto {
  @ApiProperty({ example: "Fabric" })
  @IsString()
  key: string;

  @ApiProperty({ example: "Cotton" })
  @IsString()
  value: string;
}

export class SpecSectionDto {
  @ApiProperty({ example: "Product Details" })
  @IsString()
  title: string;

  @ApiProperty({
    type: [SpecItemDto],
    example: [
      { key: "Fabric", value: "Cotton" },
      { key: "Fit", value: "Regular" },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecItemDto)
  items: SpecItemDto[];
}

export class SpecificationDescriptionDto {
  @ApiPropertyOptional({ example: "Brief product summary" })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({
    example: "Full product description with details",
    description: "Long product description (unlimited length)",
  })
  @IsOptional()
  @IsString()
  longDescription?: string;

  /** Same as `longDescription` — preferred by some clients */
  @ApiPropertyOptional({
    example: "Step up your style game with these classic white trousers...",
    description:
      "Full product description (unlimited length; same as longDescription)",
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({
    example: "<ul><li>Feature 1</li><li>Feature 2</li></ul>",
  })
  @IsOptional()
  @IsString()
  moreInfoHtml?: string;

  /** Same as `moreInfoHtml` — preferred by some clients */
  @ApiPropertyOptional({
    example: "<ul><li>Premium fabric for comfort & durability</li></ul>",
  })
  @IsOptional()
  @IsString()
  moreInfo?: string;
}

export class UpsertSpecificationBodyDto {
  @ApiProperty({
    type: [SpecSectionDto],
    example: [
      {
        title: "Product Details",
        items: [
          { key: "Fabric", value: "Cotton" },
          { key: "Fit", value: "Regular" },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecSectionDto)
  specification: SpecSectionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificationDescriptionDto)
  description?: SpecificationDescriptionDto;
}

export type UpsertSpecificationDto = UpsertSpecificationBodyDto & {
  productId: number;
};

// ─── Shipping rules ──────────────────────────────────────────────────────────

export class AdminShippingRuleDto {
  @ApiProperty({ example: "Standard under ₹999" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 999 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxOrderAmount?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Type(() => Number)
  shippingAmount: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: "Lower number = higher priority when multiple rules match",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  priority?: number;
}

export class AdminUpdateShippingRuleDto {
  @ApiPropertyOptional({ example: "Free shipping over ₹999" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 999 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxOrderAmount?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  shippingAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  priority?: number;
}

// ─── Notification settings ───────────────────────────────────────────────────

export class AdminUpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  orderPlacedEmail?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  orderShippedEmail?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  orderDeliveredEmail?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  lowStockAlert?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: "ops@aaraahomecare.com" })
  @IsOptional()
  @IsString()
  adminEmail?: string | null;
}

// ─── Store profile ───────────────────────────────────────────────────────────

export class AdminUpdateStoreProfileDto {
  @ApiPropertyOptional({ example: "Aaraa Homecare" })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({ example: "hello@aaraahomecare.com" })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ example: "+91 90000 00000" })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @ApiPropertyOptional({ example: "IN" })
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: "INR" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// ─── Admin payments ──────────────────────────────────────────────────────────

export class AdminCreateRefundDto {
  @ApiPropertyOptional({ example: "pay_MZ9x7QK2ab" })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ example: "ORD-10482" })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ example: 2499.0 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: "Customer requested cancellation" })
  @IsString()
  reason: string;
}

export class AdminReconcilePaymentDto {
  @ApiProperty({ example: "pay_MZ9x7QK2ab" })
  @IsString()
  transactionId: string;
}

export class AdminCreatePaymentLinkDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "ORD-10482" })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: "Balance payment" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminPaymentWebhookDto {
  @ApiProperty({ example: "payment.captured" })
  @IsString()
  event: string;

  @ApiProperty({ example: {} })
  @IsObject()
  payload: Record<string, unknown>;
}

// ─── Admin logistics ─────────────────────────────────────────────────────────

export class AdminBookShipmentDto {
  @ApiProperty({ example: "delhivery" })
  @IsString()
  courierId: string;

  @ApiPropertyOptional({ example: "B" })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: 1.2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weightKg?: number;
}

export class AdminLogisticsWebhookDto {
  @ApiProperty({ example: "DLV4839201" })
  @IsString()
  awb: string;

  @ApiProperty({ example: "ofd" })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: "Bengaluru Local Hub" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "2026-08-15T07:40:00Z" })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class AdminNdrReattemptDto {
  @ApiPropertyOptional({
    example: "Customer confirmed availability after 6pm",
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminNdrAddressDto {
  @ApiProperty({ example: "14 Anna Salai, Chennai, 600002" })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: "9123456780" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AdminNdrRtoDto {
  @ApiProperty({ example: "Customer refused after 3 attempts" })
  @IsString()
  reason: string;
}

export class AdminRtoRestockDto {
  @ApiProperty({ example: "pass" })
  @IsString()
  qcResult: string;

  @ApiProperty({ example: 4821, description: "Variant id or SKU string" })
  @IsDefined()
  variantId: number | string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  quantity: number;
}

export class AdminWalletRechargeDto {
  @ApiProperty({ example: 5000.0 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: "pay_MZ9x7QK2ab" })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
