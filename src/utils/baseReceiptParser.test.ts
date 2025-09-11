import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseReceiptParser } from "./baseReceiptParser";
import { DOOR_DASH_PATTERNS } from "./doorDashParser";
import { ParsingLogger } from "./parsingLogger";
import { ParsedReceiptData } from "./receiptParser";
import { UBER_EATS_PATTERNS } from "./uberEatsParser";

// Create a concrete implementation for testing
class TestReceiptParser extends BaseReceiptParser {
  canParse(): boolean {
    return true;
  }

  parse(): ParsedReceiptData | null {
    return {
      description: "Test",
      amount: "10.00",
      date: "2024-01-01",
      category: "Test",
      confidence: 0.9,
    };
  }

  protected getServiceName(): string {
    return "Test";
  }

  protected getDefaultCategory(): string {
    return "Test";
  }
}

describe("BaseReceiptParser", () => {
  let parser: TestReceiptParser;

  beforeEach(() => {
    parser = new TestReceiptParser();
    ParsingLogger.reset();
  });

  describe("extractDateFromFileName", () => {
    it("should extract valid date from filename", () => {
      const testCases = [
        { filename: "Receipt_01Jan2024.pdf", expected: "2024-01-01" },
        { filename: "Receipt_15Feb2023.pdf", expected: "2023-02-15" },
        { filename: "Receipt_31Dec2022.pdf", expected: "2022-12-31" },
        { filename: "Receipt_05Mar2025.pdf", expected: "2025-03-05" },
        { filename: "Receipt_28Apr2024.pdf", expected: "2024-04-28" },
        { filename: "Receipt_10May2024.pdf", expected: "2024-05-10" },
        { filename: "Receipt_20Jun2024.pdf", expected: "2024-06-20" },
        { filename: "Receipt_04Jul2024.pdf", expected: "2024-07-04" },
        { filename: "Receipt_15Aug2024.pdf", expected: "2024-08-15" },
        { filename: "Receipt_30Sep2024.pdf", expected: "2024-09-30" },
        { filename: "Receipt_25Oct2024.pdf", expected: "2024-10-25" },
        { filename: "Receipt_11Nov2024.pdf", expected: "2024-11-11" },
      ];

      testCases.forEach(({ filename, expected }) => {
        const result = parser["extractDateFromFileName"](filename);
        expect(result).toBe(expected);
      });
    });

    it("should return null for invalid filename formats", () => {
      const invalidFilenames = [
        "receipt.pdf",
        "Receipt_invalid.pdf",
        "Receipt_15Xyz2024.pdf", // Invalid month
        "Receipt_15Jan.pdf", // Missing year
        "Receipt_15Jan24.pdf", // 2-digit year
        "Receipt_Jan2024.pdf", // Missing day
        "",
      ];

      invalidFilenames.forEach((filename) => {
        const result = parser["extractDateFromFileName"](filename);
        expect(result).toBeNull();
      });
    });

    it("should extract date from filename even with invalid day", () => {
      // The function extracts regex matches without validating the actual date
      const result = parser["extractDateFromFileName"]("Receipt_32Jan2024.pdf");
      // Jan 32, 2024 becomes Feb 1, 2024 when parsed by Date constructor
      expect(result).toBe("2024-01-32");
    });

    it("should handle errors gracefully", () => {
      const result = parser["extractDateFromFileName"](
        null as unknown as string
      );
      expect(result).toBeNull();
    });
  });

  describe("getCurrentDate", () => {
    it("should return current date in YYYY-MM-DD format", () => {
      const result = parser["getCurrentDate"]();
      const expected = new Date().toISOString().split("T")[0];
      expect(result).toBe(expected);
    });
  });

  describe("cleanText", () => {
    it("should clean and normalize whitespace", () => {
      const testCases = [
        { input: "  multiple   spaces  ", expected: "multiple spaces" },
        { input: "line\nbreak", expected: "line break" },
        { input: "tab\there", expected: "tab here" },
        { input: "  \n  \t  ", expected: "" },
        { input: "normal text", expected: "normal text" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parser["cleanText"](input);
        expect(result).toBe(expected);
      });
    });
  });

  describe("extractAmountFromText", () => {
    it("should extract amount using UberEats patterns", () => {
      const text = "Total CA$25.50";
      const result = parser["extractAmountFromText"](
        text,
        UBER_EATS_PATTERNS.totalPatterns
      );

      expect(result).toBe("25.50");
      expect(ParsingLogger.getDebugInfo().foundAmount).toBe("25.50");
    });

    it("should extract amount using DoorDash patterns", () => {
      const text = "Total: CA$15.75";
      const result = parser["extractAmountFromText"](
        text,
        DOOR_DASH_PATTERNS.totalPatterns
      );

      expect(result).toBe("15.75");
    });

    it("should return empty string when no pattern matches", () => {
      const text = "No amount information here";
      const result = parser["extractAmountFromText"](
        text,
        UBER_EATS_PATTERNS.totalPatterns
      );

      expect(result).toBe("");
    });

    it("should find first matching pattern", () => {
      const text = "Total $12.99 Grand Total $15.00";
      const result = parser["extractAmountFromText"](
        text,
        UBER_EATS_PATTERNS.totalPatterns
      );

      expect(result).toBe("12.99");
    });

    it("should clean text before pattern matching", () => {
      const text = "  Total:   $12.99  ";
      const result = parser["extractAmountFromText"](
        text,
        UBER_EATS_PATTERNS.totalPatterns
      );

      expect(result).toBe("12.99");
    });
  });

  describe("extractTextFromPatterns", () => {
    it("should extract restaurant name using UberEats patterns", () => {
      const text = "Here's your receipt from McDonald's and Uber Eats";
      const result = parser["extractTextFromPatterns"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns
      );

      expect(result).toBe("McDonald's");
      expect(ParsingLogger.getDebugInfo().foundTextMatch).toBe("McDonald's");
    });

    it("should extract restaurant name using DoorDash patterns", () => {
      const text = "Your Dasher John Pizza Palace 3 Item";
      const result = parser["extractTextFromPatterns"](
        text,
        DOOR_DASH_PATTERNS.restaurantPatterns
      );

      expect(result).toBe("Pizza Palace");
    });

    it("should return empty string when no pattern matches", () => {
      const text = "No matching text here";
      const result = parser["extractTextFromPatterns"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns
      );

      expect(result).toBe("");
    });

    it("should trim extracted text", () => {
      const text = "You ordered from   Burger King   Picked up";
      const result = parser["extractTextFromPatterns"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns
      );

      expect(result).toBe("Burger King");
    });

    it("should handle multiple patterns and use first match", () => {
      const text = "receipt from Taco Bell and Uber Eats Order from McDonald's";
      const result = parser["extractTextFromPatterns"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns
      );

      expect(result).toBe("Taco Bell");
    });
  });

  describe("parseDateFromText", () => {
    it("should return empty string when no date found", () => {
      const text = "No date information here";
      const patterns = [/(January|February)\s+(\d{1,2}),?\s+(\d{4})/i];

      const result = parser["parseDateFromText"](text, patterns);

      expect(result).toBe("");
    });

    it("should handle parsing errors within try/catch", () => {
      // This tests that the catch block works when parseMatchedDate throws an error
      const patterns = [/Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i];

      const consoleSpy = vi.spyOn(console, "log");

      // Mock parseMatchedDate to throw an error
      const originalParseMatchedDate = parser["parseMatchedDate"];
      parser["parseMatchedDate"] = vi.fn().mockImplementation(() => {
        throw new Error("Parse error");
      });

      const result = parser["parseDateFromText"](
        "Date: Jan 15, 2024",
        patterns
      );

      expect(result).toBe("");
      expect(ParsingLogger.getDebugInfo().failedDateParse).toBe("Jan");

      // Restore original method
      parser["parseMatchedDate"] = originalParseMatchedDate;
      consoleSpy.mockRestore();
    });
  });

  describe("parseMatchedDate private method", () => {
    it("should handle unknown month abbreviations", () => {
      const text = "Date: Xyz 15, 2024"; // Invalid month abbreviation
      const patterns = [/Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i];

      const result = parser["parseDateFromText"](text, patterns);

      expect(result).toBe("");
    });

    it("should handle generic date patterns", () => {
      const text = "Some date 2024-01-15";
      const patterns = [/(\d{4}-\d{2}-\d{2})/];

      // This will hit the fallback new Date(match[1]) case
      const result = parser["parseDateFromText"](text, patterns);

      expect(result).toBe("2024-01-15");
    });
  });

  describe("getDateFromTextOrFileName", () => {
    it("should fallback to filename date when text date not found", () => {
      const text = "Order details without date";
      const fileName = "Receipt_05Mar2023.pdf";
      const patterns = [/(January|February)\s+(\d{1,2}),?\s+(\d{4})/i]; // Won't match

      const result = parser["getDateFromTextOrFileName"](
        text,
        fileName,
        patterns
      );

      expect(result).toBe("2023-03-05");
      expect(ParsingLogger.getDebugInfo().dateFromFilename).toEqual({
        filename: fileName,
        finalDate: "2023-03-05",
      });
    });

    it("should use current date when both text and filename fail", () => {
      const text = "Order details without date";
      const fileName = "invalid_filename.pdf";
      const patterns = [/(January|February)\s+(\d{1,2}),?\s+(\d{4})/i];

      const result = parser["getDateFromTextOrFileName"](
        text,
        fileName,
        patterns
      );

      expect(result).toBe(new Date().toISOString().split("T")[0]);
    });
  });

  describe("parseDateFromText - additional coverage", () => {
    it("should handle date parsing errors in try-catch", () => {
      const patterns = [/invalid-pattern-that-will-cause-error/];
      const text = "Some text without proper date format";
      const result = parser["parseDateFromText"](text, patterns);
      expect(result).toBe("");
    });

    it("should parse date using real UberEats patterns", () => {
      const text = `Simplii Visa ••••1234  03/15/24 1:34 PM  March 15, 2024  Thanks for ordering, Jeffrey  Here's your receipt from Firehouse Subs (The Boardwalk) and Uber Eats.  Total   CA$27.21  1   Club on a Sub™`;
      const result = parser["parseDateFromText"](
        text,
        UBER_EATS_PATTERNS.datePatterns
      );

      expect(result).toBe("2024-03-15");
    });

    it("should parse date using real DoorDash patterns", () => {
      const text = "Date: Jan 20, 2024";
      const result = parser["parseDateFromText"](
        text,
        DOOR_DASH_PATTERNS.datePatterns
      );

      expect(result).toBe("2024-01-20");
    });
  });

  describe("extractVendorName", () => {
    it("should extract vendor name and return it", () => {
      const text = "Here's your receipt from McDonald's and Uber Eats";
      const result = parser["extractVendorName"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns,
        "Fallback Name"
      );

      expect(result).toBe("McDonald's");
      expect(ParsingLogger.getDebugInfo().foundVendorName).toBe("McDonald's");
    });

    it("should return fallback name when no pattern matches", () => {
      const text = "No restaurant information here";
      const result = parser["extractVendorName"](
        text,
        UBER_EATS_PATTERNS.restaurantLocationPatterns,
        "Fallback Restaurant"
      );

      expect(result).toBe("Fallback Restaurant");
    });

    it("should extract vendor name from parentheses format", () => {
      const text = "Store: McDonald's (123 Main St)";
      const patterns = [/Store: (.+)/i];
      const result = parser["extractVendorName"](text, patterns, "Fallback");

      expect(result).toBe("McDonald's");
      expect(ParsingLogger.getDebugInfo().foundVendorName).toBe("McDonald's");
    });

    it("should handle empty vendor info", () => {
      const text = "Some text with no restaurant patterns";
      const result = parser["extractVendorName"](text, [], "Default Name");

      expect(result).toBe("Default Name");
    });
  });

  describe("calculateConfidence", () => {
    it("should calculate base confidence of 0.3", () => {
      const result = parser["calculateConfidence"]("", "", "");
      expect(result).toBe(0.3);
    });

    it("should add 0.4 for valid amount", () => {
      const result = parser["calculateConfidence"]("25.50", "", "");
      expect(result).toBe(0.7);
    });

    it("should add 0.2 for custom description", () => {
      const result = parser["calculateConfidence"]("", "McDonald's", "");
      expect(result).toBe(0.5);
    });

    it("should not add description bonus for default service name", () => {
      const result = parser["calculateConfidence"]("", "Test Order", "");
      expect(result).toBe(0.3);
    });

    it("should add 0.1 for non-current date", () => {
      const result = parser["calculateConfidence"]("", "", "2024-01-01");
      expect(result).toBe(0.4);
    });

    it("should not add date bonus for current date", () => {
      const currentDate = new Date().toISOString().split("T")[0];
      const result = parser["calculateConfidence"]("", "", currentDate);
      expect(result).toBe(0.3);
    });

    it("should calculate maximum confidence and cap at 0.9", () => {
      const result = parser["calculateConfidence"](
        "25.50",
        "McDonald's",
        "2024-01-01"
      );
      expect(result).toBe(0.9);
    });

    it("should round confidence to 1 decimal place", () => {
      const result = parser["calculateConfidence"]("25.50", "McDonald's", "");
      expect(result).toBe(0.9);
    });
  });

  describe("validateAndCreateResult", () => {
    it("should return null when amount is missing", () => {
      const result = parser["validateAndCreateResult"](
        "McDonald's",
        "",
        "2024-01-01"
      );

      expect(result).toBeNull();
      expect(ParsingLogger.getDebugInfo().amountExtractionFailed).toBe("Test");
    });

    it("should create valid result with all fields", () => {
      const result = parser["validateAndCreateResult"](
        "McDonald's",
        "25.50",
        "2024-01-01"
      );

      expect(result).toEqual({
        description: "McDonald's",
        amount: "25.50",
        date: "2024-01-01",
        category: "Test",
        confidence: 0.9,
      });
    });

    it("should create result with calculated confidence", () => {
      const result = parser["validateAndCreateResult"]("", "25.50", "");

      expect(result).toEqual({
        description: "",
        amount: "25.50",
        date: "",
        category: "Test",
        confidence: 0.7,
      });
    });
  });

  describe("parseWithErrorHandling", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should execute parse logic and return result", () => {
      const mockParseLogic = vi.fn().mockReturnValue({
        description: "Test",
        amount: "10.00",
        date: "2024-01-01",
        category: "Test",
        confidence: 0.9,
      });

      const result = parser["parseWithErrorHandling"](
        "text",
        "file.pdf",
        mockParseLogic
      );

      expect(result).toEqual({
        description: "Test",
        amount: "10.00",
        date: "2024-01-01",
        category: "Test",
        confidence: 0.9,
      });
      expect(mockParseLogic).toHaveBeenCalledWith("text", "file.pdf");
    });

    it("should handle errors and return null", () => {
      const mockParseLogic = vi.fn().mockImplementation(() => {
        throw new Error("Parse error");
      });

      const result = parser["parseWithErrorHandling"](
        "text",
        "file.pdf",
        mockParseLogic
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error parsing Test text:",
        expect.any(Error)
      );
    });

    it("should catch any type of error", () => {
      const mockParseLogic = vi.fn().mockImplementation(() => {
        throw "String error";
      });

      const result = parser["parseWithErrorHandling"](
        "text",
        "file.pdf",
        mockParseLogic
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error parsing Test text:",
        "String error"
      );
    });
  });

  describe("parseDateFromText - slash date patterns", () => {
    it("should parse slash date with 4-digit year using DoorDash patterns", () => {
      const text = "Date: 1/15/2024";
      const result = parser["parseDateFromText"](
        text,
        DOOR_DASH_PATTERNS.datePatterns
      );

      expect(result).toBe("2024-01-15");
    });

    it("should parse slash date with 2-digit year using DoorDash patterns", () => {
      const text = "Date: 1/15/24";
      const result = parser["parseDateFromText"](
        text,
        DOOR_DASH_PATTERNS.datePatterns
      );

      expect(result).toBe("2024-01-15");
    });
  });
});
