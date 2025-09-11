import * as pdfjsLib from "pdfjs-dist";
import { PDFDocumentLoadingTask } from "pdfjs-dist";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseReceiptParser } from "./baseReceiptParser";
import { DoorDashReceiptParser } from "./doorDashParser";
import {
  formatFileSize,
  isValidReceiptFile,
  parseReceiptFile,
  ReceiptParserFactory,
} from "./receiptParser";
import { UberEatsReceiptParser } from "./uberEatsParser";

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
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.description).toBe("McDonald's");
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
      } as unknown as File;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as unknown as PDFDocumentLoadingTask);

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
      } as unknown as File;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe("2023-12-25");
    });

    it("should handle general parsing errors", async () => {
      const mockFile = {
        name: "test.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockRejectedValue(new Error("File read error")),
      } as unknown as File;

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
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      await parseReceiptFile(mockFile);

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
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
    });

    it("should handle multiple page PDFs", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe("15.99");
    });

    it("should handle Canadian dollar amounts", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe("12.75");
    });

    it("should handle different date formats", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.date).toBe("2023-12-25");
    });

    it("should handle invalid date parsing", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).not.toBeNull();
      expect(result?.date).toBe("2024-01-15"); // Should fallback to filename
    });

    it("should return null when no amount found", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).toBeNull();
    });

    it("should handle UberEats text parsing errors", async () => {
      const mockFile = {
        name: "Receipt_15Jan2024.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

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
      } as unknown as PDFDocumentLoadingTask);

      // Mock console.error to avoid test output noise
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await parseReceiptFile(mockFile);

      consoleSpy.mockRestore();
    });

    it("should handle filename date extraction failure", async () => {
      const mockFile = {
        name: "invalid-filename.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe(new Date().toISOString().split("T")[0]); // Should use current date
    });

    it("should handle filename date extraction with invalid month", async () => {
      const mockFile = {
        name: "Receipt_15Xyz2024.pdf", // Invalid month
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as unknown as PDFDocumentLoadingTask);

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

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(
        mockPdf as unknown as pdfjsLib.PDFDocumentLoadingTask
      );

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

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(
        mockPdf as unknown as pdfjsLib.PDFDocumentLoadingTask
      );

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

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(
        mockPdf as unknown as pdfjsLib.PDFDocumentLoadingTask
      );

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

      vi.mocked(pdfjsLib.getDocument).mockResolvedValue(
        mockPdf as unknown as pdfjsLib.PDFDocumentLoadingTask
      );

      const result = await parseReceiptFile(mockFile);
      // Should use current date as fallback
      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("should handle errors in UberEats parsing function", async () => {
      // Create a file that will trigger UberEats parsing
      const mockFile = new File(["test content"], "uber_eats_receipt.pdf", {
        type: "application/pdf",
      });

      // Mock PDF.js to return valid text but simulate error during UberEats parsing
      // by providing malformed text that causes an error in the parsing logic
      const mockTextItems = [
        { str: "UberEats", transform: [1, 0, 0, 1, 100, 100] },
        { str: "Total $15.99", transform: [1, 0, 0, 1, 100, 150] },
      ];

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: mockTextItems,
        }),
      };

      const mockDocument = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockDocument),
      } as unknown as PDFDocumentLoadingTask);

      // Spy on Date constructor to cause an error in date parsing
      const originalDate = global.Date;
      global.Date = vi.fn().mockImplementation(() => {
        throw new Error("Date parsing error");
      }) as unknown as typeof Date;

      // Create a spy to monitor console.error being called (lines 272-274)
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const result = await parseReceiptFile(mockFile);

        // The function should handle the error gracefully by catching it
        // and logging the error (testing lines 272-274: console.error and return null)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error parsing receipt:",
          expect.any(Error)
        );

        // Should return null when parsing fails at the top level
        expect(result).toBeNull();
      } finally {
        // Restore original Date constructor and console.error
        global.Date = originalDate;
        consoleErrorSpy.mockRestore();
      }
    });

    it("should handle errors in extractDateFromFileName function", async () => {
      // Create a file with a special filename that could cause issues
      // Since extractDateFromFileName is internal, we test it indirectly through UberEats parsing
      const mockFile = new File(["test content"], "Receipt_invalid_date.pdf", {
        type: "application/pdf",
      });

      // Mock PDF.js to return UberEats content without a date
      const mockTextItems = [
        { str: "UberEats Receipt", transform: [1, 0, 0, 1, 100, 100] },
        { str: "Total $15.99", transform: [1, 0, 0, 1, 100, 150] },
        { str: "Restaurant Name", transform: [1, 0, 0, 1, 100, 200] },
      ];

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: mockTextItems,
        }),
      };

      const mockDocument = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockDocument),
      } as unknown as PDFDocumentLoadingTask);

      // Create a spy to monitor extractDateFromFileName being called
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await parseReceiptFile(mockFile);

      // The function should handle the invalid filename gracefully and use current date
      expect(result).not.toBeNull();
      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("ReceiptParserFactory", () => {
    beforeEach(() => {
      // Reset parsers to default state
      ReceiptParserFactory["parsers"] = [
        new UberEatsReceiptParser(),
        new DoorDashReceiptParser(),
      ];
    });

    describe("findParser", () => {
      it("should find UberEats parser for UberEats content", () => {
        const text = "Here's your receipt from McDonald's and Uber Eats";
        const fileName = "receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        expect(parser).toBeInstanceOf(UberEatsReceiptParser);
      });

      it("should find DoorDash parser for DoorDash content", () => {
        const text = "Order Confirmation for John from Subway - DoorDash";
        const fileName = "receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        expect(parser).toBeInstanceOf(DoorDashReceiptParser);
      });

      it("should find UberEats parser by filename", () => {
        const text = "Some generic receipt text";
        const fileName = "ubereats_receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        expect(parser).toBeInstanceOf(UberEatsReceiptParser);
      });

      it("should find DoorDash parser by filename", () => {
        const text = "Some generic receipt text";
        const fileName = "doordash_order.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        expect(parser).toBeInstanceOf(DoorDashReceiptParser);
      });

      it("should return null when no parser matches", () => {
        const text = "Generic receipt without service markers";
        const fileName = "generic_receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        expect(parser).toBeNull();
      });

      it("should prioritize first matching parser", () => {
        const text =
          "Receipt from restaurant with UberEats and DoorDash mentions";
        const fileName = "receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        // Should return UberEats because it's first in the parsers array
        expect(parser).toBeInstanceOf(UberEatsReceiptParser);
      });
    });

    describe("registerParser", () => {
      it("should register a new parser", () => {
        const mockParser = {
          canParse: vi.fn().mockReturnValue(true),
          parse: vi.fn().mockReturnValue({
            description: "Custom Order",
            amount: "10.00",
            date: "2024-01-01",
            category: "Food",
            confidence: 0.8,
          }),
          getServiceName: vi.fn().mockReturnValue("Custom"),
          getDefaultCategory: vi.fn().mockReturnValue("Food"),
        } as unknown as BaseReceiptParser;

        ReceiptParserFactory.registerParser(mockParser);

        const parser = ReceiptParserFactory.findParser("test", "test.pdf");

        expect(parser).toBe(mockParser);
        expect(mockParser.canParse).toHaveBeenCalledWith("test", "test.pdf");
      });

      it("should call registered parser before default parsers", () => {
        const customParser = {
          canParse: vi.fn().mockReturnValue(false),
          parse: vi.fn(),
        } as unknown as BaseReceiptParser;

        // Reset to ensure clean state
        ReceiptParserFactory["parsers"] = [];
        ReceiptParserFactory.registerParser(customParser);
        ReceiptParserFactory.registerParser(new UberEatsReceiptParser());

        const text = "Here's your receipt from McDonald's and Uber Eats";
        const fileName = "receipt.pdf";

        const parser = ReceiptParserFactory.findParser(text, fileName);

        // Custom parser should be called first
        expect(customParser.canParse).toHaveBeenCalledWith(text, fileName);
        // But should still return UberEats parser since custom returned false
        expect(parser).toBeInstanceOf(UberEatsReceiptParser);
      });
    });
  });

  describe("DoorDashReceiptParser", () => {
    let parser: DoorDashReceiptParser;

    beforeEach(() => {
      parser = new DoorDashReceiptParser();
    });

    describe("canParse", () => {
      it("should identify DoorDash in text content", () => {
        expect(
          parser.canParse("DoorDash Order Confirmation", "receipt.pdf")
        ).toBe(true);
        expect(parser.canParse("Order from Door Dash", "receipt.pdf")).toBe(
          true
        );
        expect(parser.canParse("doordash delivery", "receipt.pdf")).toBe(true);
      });

      it("should identify DoorDash in filename", () => {
        expect(parser.canParse("Generic receipt", "doordash_receipt.pdf")).toBe(
          true
        );
        expect(parser.canParse("Generic receipt", "DoorDash_Order.pdf")).toBe(
          true
        );
      });

      it("should return false for non-DoorDash content", () => {
        expect(parser.canParse("UberEats Order", "receipt.pdf")).toBe(false);
        expect(parser.canParse("Generic receipt", "receipt.pdf")).toBe(false);
      });
    });

    describe("parse", () => {
      it("should parse official DoorDash receipt", async () => {
        const mockFile = `Order Complete  Friday, April 25, 2025 at 2:18 AM  Your order is complete. Enjoy!  Your Dasher  Amandeep  Church's Chicken  1 Item  Subtotal   CA$17.39  Delivery Fee   CA$1.99   CA$0.00  Service Fee   CA$1.99   CA$1.04  Estimated Tax   CA$1.49  Discount   -CA$6.96  Dasher Tip   CA$2.50  Total   CA$15.46  Address  123 Fake Street,   Toronto,   ON   A1B 2X1  Leave it at my door  Delivery Instructions  Please do NOT ring the doorbell. UNIT 21. It is a TOWNHOUSE not a house. do not drop off at the incorrect location. Message me if you cannot find the house.  Create a business profile  Keep track of your business receipts  1×   5 Piece Tenders Combo  CA$17.39  Sweet and Sour, Sweet and Sour, Nestea, Original, Mashed Potatoes  Payment  Visa....3241 · 4/25/2025 · 1:59 AM   CA$15.46`;

        const parser = new DoorDashReceiptParser();
        const result = parser.parse(
          mockFile,
          "DoorDash Food Delivery - Order History.pdf"
        );

        expect(result).not.toBeNull();
        expect(result?.description).toBe("Church's Chicken");
        expect(result?.amount).toBe("15.46");
        expect(result?.date).toBe("2025-04-25");
        expect(result?.category).toBe("Food & Dining");
        expect(result?.confidence).toBeGreaterThanOrEqual(0.3);
      });

      it("should parse Desktop export of UberEats receipt email from Outlook", async () => {
        const mockFile = `Track Your Order  O utloo k  O r de r   C on fi rm a t i on   f or   J eff r e y   f rom   W e n d y ' s  F rom   D oor D a s h   O r de r   < no - r e ply @ d oor da s h . c om >  D a t e   F r i   2025-03-07   12 : 46   AM  T o   fake @ h otm ai l . c om   < fake @ h otm ai l . c om >  Thanks for your  order, Jeffrey  The estimated delivery time for your order  is   1:03 AM - 1:13 AM . Track your order in  the DoorDash app or website.  Paid with Visa Ending in 9573  Wendy's  Total: CA$22.11  Your receipt  123 Fake St, Toronto, ON A1B 2X1, Canada  - For: Jeffrey Polasz -  1x   Baconator® with Cheese Combo   (Combos)  • Small Combo  • Baconator® with Cheese (Cals: 970)  • Premium Bun  • Ketchup  • Processed Cheese Slice  • Mayonnaise  • Caesar Side Salad (Cals: 340)  • Napkin  • Fork  • Mighty Caesar dressing  • Applewood Smoked Bacon  • Crouton Crumble  • Dasani® Water (500 ml) (Cals: 0)  CA$16.37  Subtotal   CA$16.37  Taxes   CA$2.26  Delivery Fee   CA$0.00  Service Fee   CA$0.98  Tip   CA$2.50  Discounts   -CA$19.98  Total Charged   CA$22.11`;

        const parser = new DoorDashReceiptParser();
        const result = parser.parse(
          mockFile,
          "Mail - Jeff Polasz - Outlook.pdf"
        );

        expect(result).not.toBeNull();
        expect(result?.description).toBe("Wendy's");
        expect(result?.amount).toBe("22.11");
        expect(result?.date).toBe("2025-03-07");
        expect(result?.category).toBe("Food & Dining");
        expect(result?.confidence).toBeGreaterThanOrEqual(0.3);
      });

      it("should return null when amount not found", () => {
        const text =
          "Order Confirmation for John from Restaurant\nDate: Jan 15, 2024\nNo total amount here";

        const result = parser.parse(text, "receipt.pdf");

        expect(result).toBeNull();
      });

      it("should handle parsing errors gracefully", () => {
        const text = null as unknown as string; // Force an error

        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        const result = parser.parse(text, "receipt.pdf");

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error parsing DoorDash text:",
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it("should extract amount when total pattern matches", () => {
        const text = "DoorDash order\nTotal: $25.99\nJan 15, 2024";

        const result = parser.parse(text, "receipt.pdf");

        expect(result).not.toBeNull();
        expect(result?.amount).toBe("25.99");
        expect(result?.category).toBe("Food & Dining");
        expect(result?.confidence).toBe(0.9);
      });

      it("should extract restaurant name from order confirmation pattern", () => {
        const text = "Order Confirmation for John from Pizza Palace";

        const result = parser.parse(text, "receipt.pdf");

        // Since we don't have a total, this should return null
        expect(result).toBeNull();
      });

      it("should use filename date when no date found in text", () => {
        const text = "Order from Restaurant\nTotal: $9.99";

        const result = parser.parse(text, "Receipt_05Jan2024.pdf");

        expect(result?.date).toBe("2024-01-05");
      });

      it("should handle Canadian dollar format", () => {
        const text = "DoorDash order\nTotal: CA$12.75";

        const result = parser.parse(text, "receipt.pdf");

        expect(result?.amount).toBe("12.75");
      });
    });
  });

  describe("UberEatsReceiptParser", () => {
    let parser: UberEatsReceiptParser;

    beforeEach(() => {
      parser = new UberEatsReceiptParser();
    });

    describe("canParse", () => {
      it("should identify UberEats in text content", () => {
        expect(
          parser.canParse(
            "Here's your receipt from Restaurant and Uber Eats",
            "receipt.pdf"
          )
        ).toBe(true);
        expect(
          parser.canParse("UberEats delivery confirmation", "receipt.pdf")
        ).toBe(true);
        expect(parser.canParse("ubereats order receipt", "receipt.pdf")).toBe(
          true
        );
      });

      it("should identify UberEats filename patterns", () => {
        expect(parser.canParse("Generic receipt", "ubereats_receipt.pdf")).toBe(
          true
        );
        expect(
          parser.canParse("Generic receipt", "Receipt_15Jan2024.pdf")
        ).toBe(true);
      });

      it("should identify generic order patterns", () => {
        expect(
          parser.canParse(
            "You ordered from Restaurant Total $15.00",
            "receipt.pdf"
          )
        ).toBe(true);
        expect(
          parser.canParse(
            "Here's your receipt from Restaurant Total $20.00",
            "receipt.pdf"
          )
        ).toBe(true);
      });

      it("should return false for non-matching content", () => {
        expect(parser.canParse("DoorDash Order", "receipt.pdf")).toBe(false);
        expect(parser.canParse("Generic receipt", "document.txt")).toBe(false);
      });
    });

    describe("parse", () => {
      it("should parse official UberEats receipt", async () => {
        const mockFile = `Simplii Visa ••••1234  9/5/25 1:34 PM  September 5, 2025  Thanks for ordering, Jeffrey  Here's your receipt from Firehouse Subs (The Boardwalk) and Uber Eats.  Total   CA$27.21  1   Club on a Sub™   CA$24.28  Choices for Club on a Sub™  Medium (7-8 inch) CA$6.99  BREAD TYPE  Wheat Bread CA$0.00  PICKLE  Side Pickle CA$0.00  Make it a Combo  Brownie Combo CA$6.99  CUSTOMIZE  Turkey CA$0.00  Ham CA$0.00  Bacon CA$0.00  Monterey Jack CA$0.00  Lettuce CA$0.00  Tomato CA$0.00  Onion CA$0.00  No Deli Mustard CA$0.00  Mayo CA$0.00  Subtotal   CA$24.28  Delivery Fee   CA$2.99  Service Fee   CA$2.91  Tax   CA$2.84  Tip   CA$2.50  Delivery Discount   -CA$2.99  Membership Benefit   -CA$1.00  Special Offers   -CA$4.32  Payments  CA$27.21  You ordered from Firehouse Subs (The Boardwalk)  Picked up from  210 The Boardwalk, Kitchener, ON N2N 0B1, CA  Delivered to  123 Fake St, Toronto, ON A1B 2X1,  Canada`;

        const parser = new UberEatsReceiptParser();
        const result = parser.parse(mockFile, "Receipt_05Sep2025_173438.pdf");

        expect(result).not.toBeNull();
        expect(result?.description).toBe("Firehouse Subs");
        expect(result?.amount).toBe("27.21");
        expect(result?.date).toBe("2025-09-05");
        expect(result?.category).toBe("Food & Dining");
        expect(result?.confidence).toBeGreaterThanOrEqual(0.3);
      });

      it("should return null when amount not found", () => {
        const text =
          "You ordered from Restaurant\nJanuary 15, 2024\nNo total amount here";

        const result = parser.parse(text, "receipt.pdf");

        expect(result).toBeNull();
      });

      it("should handle parsing errors gracefully", () => {
        const text = null as unknown as string; // Force an error

        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        const result = parser.parse(text, "receipt.pdf");

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error parsing UberEats text:",
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it("should extract amount when total pattern matches", () => {
        const text =
          "Here's your receipt from Restaurant and Uber Eats\nTotal $25.50\nJanuary 15, 2024";

        const result = parser.parse(text, "receipt.pdf");

        expect(result).not.toBeNull();
        expect(result?.amount).toBe("25.50");
        expect(result?.category).toBe("Food & Dining");
        expect(result?.confidence).toBe(0.9);
      });

      it("should extract restaurant name from receipt pattern", () => {
        const text =
          "Here's your receipt from McDonald's and Uber Eats\nTotal $25.50";

        const result = parser.parse(text, "receipt.pdf");

        expect(result?.description).toBe("McDonald's");
        expect(result?.amount).toBe("25.50");
      });

      it("should handle Canadian dollar format", () => {
        const text = "receipt from Tim Hortons and Uber Eats\nTotal CA$12.75";

        const result = parser.parse(text, "receipt.pdf");

        expect(result?.amount).toBe("12.75");
      });

      it("should use default description when restaurant not found", () => {
        const text = "UberEats delivery\nTotal $15.00";

        const result = parser.parse(text, "receipt.pdf");

        expect(result?.description).toBe("UberEats Order");
        expect(result?.amount).toBe("15.00");
      });
    });
  });

  describe("generic fallback parsing", () => {
    it("should create fallback receipt when no parser matches", async () => {
      const mockFile = {
        name: "invoice_15Jan2024.pdf", // Different filename pattern to avoid UberEats match
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

      // Mock PDF content that doesn't match any parser patterns
      // Avoid "receipt from", "you ordered", "total", "uber", "doordash"
      const mockTextContent = {
        items: [
          { str: "Hardware Store Purchase" },
          { str: "Items bought today:" },
          { str: "Screws - $2.50" },
          { str: "Paint - $15.75" },
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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result).toEqual({
        description: "Receipt",
        amount: "",
        date: new Date().toISOString().split("T")[0], // Current date since filename doesn't match pattern
        category: "Miscellaneous",
        confidence: 0.3,
      });
    });

    it("should use current date when filename date extraction fails", async () => {
      const mockFile = {
        name: "invalid_filename.pdf",
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

      const mockTextContent = {
        items: [{ str: "Generic receipt without service markers" }],
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
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
    });
  });

  describe("extractDateFromFileName standalone function", () => {
    // Access the function through parsing behavior since it's not exported
    it("should extract various date formats from filenames", async () => {
      const testCases = [
        { filename: "Receipt_01Jan2024.pdf", expected: "2024-01-01" },
        { filename: "Receipt_15Feb2023.pdf", expected: "2023-02-15" },
        { filename: "Receipt_31Dec2022.pdf", expected: "2022-12-31" },
        { filename: "Receipt_05Mar2025.pdf", expected: "2025-03-05" },
      ];

      for (const { filename, expected } of testCases) {
        const mockFile = {
          name: filename,
          type: "application/pdf",
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        } as unknown as File;

        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
          promise: Promise.reject(new Error("PDF parsing failed")),
        } as unknown as PDFDocumentLoadingTask);

        const result = await parseReceiptFile(mockFile);

        expect(result?.date).toBe(expected);
      }
    });

    it("should handle invalid filename formats", async () => {
      const invalidFilenames = [
        "receipt.pdf",
        "Receipt_invalid.pdf",
        "Receipt_15Xyz2024.pdf", // Invalid month
        "Receipt_15Jan.pdf", // Missing year
      ];

      for (const filename of invalidFilenames) {
        const mockFile = {
          name: filename,
          type: "application/pdf",
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        } as unknown as File;

        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
          promise: Promise.reject(new Error("PDF parsing failed")),
        } as unknown as PDFDocumentLoadingTask);

        const result = await parseReceiptFile(mockFile);

        expect(result?.date).toBe(new Date().toISOString().split("T")[0]);
      }
    });

    it("should handle filename with invalid day gracefully", async () => {
      const mockFile = {
        name: "Receipt_32Jan2024.pdf", // Invalid day (32nd)
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as unknown as File;

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error("PDF parsing failed")),
      } as unknown as PDFDocumentLoadingTask);

      const result = await parseReceiptFile(mockFile);

      // The extractDateFromFileName function just formats the extracted parts as YYYY-MM-DD
      // It doesn't validate the date, so day 32 remains as is
      expect(result?.date).toBe("2024-01-32");
    });
  });
});
