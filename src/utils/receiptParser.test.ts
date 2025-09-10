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

    it("should handle general parsing errors", async () => {
      const mockFile = {
        name: "test.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockRejectedValue(new Error("File read error")),
      } as any;

      const result = await parseReceiptFile(mockFile);
      // When parsing fails, it should return a fallback result or null
      expect(result).toBeTruthy(); // It returns a default result with filename info
      expect(result?.description).toBe("UberEats Order");
    });

    it("should handle missing PDF worker configuration", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      // Clear worker src to test the configuration
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";

      const mockTextContent = {
        items: [{ str: "Test receipt" }, { str: "Total $10.00" }],
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

      // Should set worker src
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toContain(
        "pdf.worker.mjs"
      );
    });

    it("should handle text content without str property", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { notStr: "This should be ignored" }, // Missing 'str' property
          { str: "Total $10.00" },
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
    });

    it("should handle multiple page PDFs", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent1 = {
        items: [{ str: "Page 1 content" }],
      };

      const mockTextContent2 = {
        items: [
          { str: "Here's your receipt from McDonald's and Uber Eats" },
          { str: "Total $15.99" },
          { str: "January 15, 2024" },
        ],
      };

      const mockPage1 = {
        getTextContent: vi.fn().mockResolvedValue(mockTextContent1),
      };

      const mockPage2 = {
        getTextContent: vi.fn().mockResolvedValue(mockTextContent2),
      };

      const mockPdf = {
        numPages: 2,
        getPage: vi
          .fn()
          .mockResolvedValueOnce(mockPage1)
          .mockResolvedValueOnce(mockPage2),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe("15.99");
    });

    it("should handle Canadian dollar amounts", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { str: "Here's your receipt from Tim Hortons and Uber Eats" },
          { str: "Total CA$12.75" },
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
      expect(result?.amount).toBe("12.75");
    });

    it("should handle restaurant with location in parentheses", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          {
            str: "Here's your receipt from McDonald's (123 Main Street, Downtown) and Uber Eats",
          },
          { str: "Total $18.50" },
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
      expect(result?.description).toBe(
        "McDonald's (123 Main Street, Downtown)"
      );
    });

    it("should extract location from pickup address", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { str: "You ordered from Pizza Place" },
          { str: "Picked up from 456 Oak Avenue Delivered to" },
          { str: "Total $22.00" },
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
      expect(result?.description).toBe("Pizza Place (456 Oak Avenue)");
    });

    it("should handle different date formats", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { str: "Receipt from Restaurant" },
          { str: "Total $15.00" },
          { str: "12/25/2023" }, // MM/DD/YYYY format
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
      expect(result?.date).toBe("2023-12-25");
    });

    it("should handle invalid date parsing", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { str: "Receipt from Restaurant" },
          { str: "Total $15.00" },
          { str: "Invalid date 99/99/9999" },
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
      expect(result?.date).toBe("2024-01-15"); // Should fallback to filename
    });

    it("should return null when no amount found", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [
          { str: "Here's your receipt from Restaurant and Uber Eats" },
          { str: "No amount information here" },
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

      expect(result).toBeNull();
    });

    it("should handle UberEats text parsing errors", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      const mockTextContent = {
        items: [{ str: "Some text that causes parsing to throw" }],
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

      // Mock console.error to avoid test output noise
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await parseReceiptFile(mockFile);

      consoleSpy.mockRestore();
    });

    it("should handle filename date extraction failure", async () => {
      const mockFile = {
        name: "invalid-filename.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe(new Date().toISOString().split("T")[0]); // Should use current date
    });

    it("should handle filename date extraction with invalid month", async () => {
      const mockFile = {
        name: "Receipt_15Xyz2024.pdf", // Invalid month
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as any);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe(new Date().toISOString().split("T")[0]); // Should use current date
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

  describe("error handling", () => {
    it("should handle errors in parseReceiptFile for non-PDF files", async () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });

      const result = await parseReceiptFile(mockFile);
      expect(result).toBeNull();
    });

    it("should handle date parsing errors gracefully", async () => {
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: "Receipt from Restaurant" },
            { str: "Date: invalid-date-format" }, // This should cause parsing error
            { str: "Total: $15.99" },
          ],
        }),
      };

      const mockPdf = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(mockPdf as any);

      const result = await parseReceiptFile(mockFile);
      // Should still parse other parts but use fallback date
      expect(result).toBeTruthy();
      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("should use fallback date when no date found in text", async () => {
      const mockFile = new File(["test"], "receipt.pdf", {
        type: "application/pdf",
      });
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: "Receipt from Restaurant" },
            { str: "Total: $15.99" },
            // No date in the text
          ],
        }),
      };

      const mockPdf = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(mockPdf as any);

      const result = await parseReceiptFile(mockFile);
      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("should handle UberEats parsing errors by returning fallback", async () => {
      const mockFile = new File(["test"], "uber-receipt.pdf", {
        type: "application/pdf",
      });
      const mockPage = {
        getTextContent: vi.fn().mockImplementation(() => {
          throw new Error("Failed to get text content");
        }),
      };

      const mockPdf = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(mockPdf as any);

      const result = await parseReceiptFile(mockFile);
      // Should return fallback UberEats template
      expect(result).toEqual({
        description: "UberEats Order",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "Food & Dining",
        confidence: 0.3,
      });
    });

    it("should handle filename date extraction errors", async () => {
      const mockFile = new File(["test"], "invalid-filename.pdf", {
        type: "application/pdf",
      });
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: "Receipt from Restaurant" }, { str: "Total: $15.99" }],
        }),
      };

      const mockPdf = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(mockPdf as any);

      const result = await parseReceiptFile(mockFile);
      // Should use current date as fallback
      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
    });
  });
});
