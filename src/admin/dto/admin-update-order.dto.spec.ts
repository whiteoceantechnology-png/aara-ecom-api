import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { AdminUpdateOrderDto } from "./admin.dto";

describe("AdminUpdateOrderDto", () => {
  const validate = (body: Record<string, unknown>) =>
    validateSync(plainToInstance(AdminUpdateOrderDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it("accepts status with trackingImageUrl", () => {
    expect(
      validate({
        status: "SHIPPED",
        trackingImageUrl: "2026/11/03/a.jpeg",
      }),
    ).toHaveLength(0);
  });

  it("accepts the trackingImage alias", () => {
    expect(
      validate({ status: "SHIPPED", trackingImage: "a.jpeg" }),
    ).toHaveLength(0);
  });

  it("rejects a non-string trackingImageUrl", () => {
    expect(validate({ trackingImageUrl: 123 })).not.toHaveLength(0);
  });
});
