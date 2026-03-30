import { slugifyCategoryName, uniqueCategorySlug } from "./category-slug.util";

describe("category-slug.util", () => {
  describe("slugifyCategoryName", () => {
    it("should produce kebab-case from a name", () => {
      expect(slugifyCategoryName("Raw Dried Herbs")).toBe("raw-dried-herbs");
    });

    it("should strip punctuation", () => {
      expect(slugifyCategoryName("Oils & Extracts!")).toBe("oils-extracts");
    });

    it("should fall back when empty after strip", () => {
      expect(slugifyCategoryName("@@@")).toBe("category");
    });
  });

  describe("uniqueCategorySlug", () => {
    it("should return base slug when free", async () => {
      const prisma = {
        category: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      await expect(uniqueCategorySlug(prisma as any, "Tea")).resolves.toBe("tea");
    });

    it("should append suffix when taken", async () => {
      const prisma = {
        category: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 1 })
            .mockResolvedValueOnce(null),
        },
      };
      await expect(uniqueCategorySlug(prisma as any, "Tea")).resolves.toBe(
        "tea-1",
      );
    });
  });
});
