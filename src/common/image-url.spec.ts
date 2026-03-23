import { toImageUrl, toImageUrls, toCategoryImageUrl } from "./image-url";

describe("image-url", () => {
  describe("toImageUrl()", () => {
    it("returns null for null input", () => {
      expect(toImageUrl(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(toImageUrl(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(toImageUrl("")).toBeNull();
    });

    it("returns path as-is when it starts with / (legacy path)", () => {
      expect(toImageUrl("/images/category/photo.png")).toBe(
        "/images/category/photo.png",
      );
      expect(toImageUrl("/admin/images/serve?path=x")).toBe(
        "/admin/images/serve?path=x",
      );
    });

    it("converts upload API path to serve URL", () => {
      const path = "2026/03/20/1773990762403-abc12345.jpeg";
      const result = toImageUrl(path);
      expect(result).toBe(
        "/admin/images/serve?path=2026%2F03%2F20%2F1773990762403-abc12345.jpeg",
      );
    });

    it("encodes special characters in path", () => {
      const path = "2026/03/20/file with spaces.jpeg";
      const result = toImageUrl(path);
      expect(result).toContain("path=");
      expect(decodeURIComponent(result!.split("path=")[1])).toBe(path);
    });
  });

  describe("toImageUrls()", () => {
    it("returns empty array for empty input", () => {
      expect(toImageUrls([])).toEqual([]);
    });

    it("transforms array of upload paths to serve URLs", () => {
      const paths = ["2026/03/20/photo1.jpeg", "2026/03/20/photo2.png"];
      const result = toImageUrls(paths);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain("/admin/images/serve?path=");
      expect(result[1]).toContain("/admin/images/serve?path=");
    });

    it("preserves legacy paths (starting with /) in array", () => {
      const paths = ["/images/old.png", "2026/03/20/new.jpeg"];
      const result = toImageUrls(paths);
      expect(result[0]).toBe("/images/old.png");
      expect(result[1]).toContain("/admin/images/serve?path=");
    });

    it("filters out empty and null-like paths", () => {
      const paths = ["/legacy.png", "", "2026/03/20/valid.jpeg", "  "];
      const result = toImageUrls(paths);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("/legacy.png");
      expect(result[1]).toContain("/admin/images/serve?path=");
    });
  });

  describe("toCategoryImageUrl() (alias)", () => {
    it("behaves identically to toImageUrl", () => {
      expect(toCategoryImageUrl("2026/03/20/x.jpeg")).toBe(
        toImageUrl("2026/03/20/x.jpeg"),
      );
    });
  });
});
