import * as pdfjsLib from "pdfjs-dist";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatFileSize,
  isValidReceiptFile,
  parseReceiptFile,
} from "./receiptParser";

// Mock PDF.js
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  version: "4.0.0",
  GlobalWorkerOptions: {
    workerSrc: "",
  },
}));

describe("receiptParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseReceiptFile", () => {
    it("should return null for non-PDF and non-image files", async () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const result = await parseReceiptFile(file);
      expect(result).toBeNull();
    });

    it("should return null for image files (not yet implemented)", async () => {
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const result = await parseReceiptFile(file);
      expect(result).toBeNull();
    });

    it("should parse PDF files", async () => {
      // Create a mock file with arrayBuffer method
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      // Mock PDF.js response with UberEats receipt text
      const mockTextContent = {
        items: [
          {
            str: "Here's your receipt from McDonald's (123 Main St) and Uber Eats",
          },
          { str: "Total $25.50" },
          { str: "January 15, 2024" },
        ],
      };

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue(mockTextContent),
      };

      const mockPdf = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.description).toBe("McDonald's (123 Main St)");
      expect(result?.amount).toBe("25.50");
      expect(result?.date).toBe("2024-01-15");
      expect(result?.category).toBe("Food & Dining");
      expect(result?.confidence).toBe(0.9);
    });

    it("should handle PDF parsing errors gracefully", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.description).toBe("UberEats Order");
      expect(result?.amount).toBe("");
      expect(result?.date).toBe("2024-01-15"); // Extracted from filename
      expect(result?.category).toBe("Food & Dining");
      expect(result?.confidence).toBe(0.3);
    });

    it("should extract date from filename when PDF parsing fails", async () => {
      const mockFile = {
        name: "Receipt_25Dec2023.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe("2023-12-25");
    });
  });

  describe("isValidReceiptFile", () => {
    it("should accept valid image file types", () => {
      const jpegFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const jpgFile = new File(["content"], "test.jpg", { type: "image/jpg" });
      const pngFile = new File(["content"], "test.png", { type: "image/png" });
      const webpFile = new File(["content"], "test.webp", {
        type: "image/webp",
      });

      expect(isValidReceiptFile(jpegFile)).toBe(true);
      expect(isValidReceiptFile(jpgFile)).toBe(true);
      expect(isValidReceiptFile(pngFile)).toBe(true);
      expect(isValidReceiptFile(webpFile)).toBe(true);
    });

    it("should accept PDF files", () => {
      const pdfFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      expect(isValidReceiptFile(pdfFile)).toBe(true);
    });

    it("should reject invalid file types", () => {
      const textFile = new File(["content"], "test.txt", {
        type: "text/plain",
      });
      const docFile = new File(["content"], "test.doc", {
        type: "application/msword",
      });

      expect(isValidReceiptFile(textFile)).toBe(false);
      expect(isValidReceiptFile(docFile)).toBe(false);
    });

    it("should reject files larger than 10MB", () => {
      const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.pdf", {
        type: "application/pdf",
      });
      expect(isValidReceiptFile(largeFile)).toBe(false);
    });

    it("should accept files smaller than 10MB", () => {
      const smallFile = new File(["x".repeat(5 * 1024 * 1024)], "small.pdf", {
        type: "application/pdf",
      });
      expect(isValidReceiptFile(smallFile)).toBe(true);
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(512)).toBe("512 Bytes");
      expect(formatFileSize(1023)).toBe("1023 Bytes");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
      expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
    });

    it("should handle decimal places correctly", () => {
      expect(formatFileSize(1234)).toBe("1.21 KB");
      expect(formatFileSize(1234567)).toBe("1.18 MB");
    });
  });
});
