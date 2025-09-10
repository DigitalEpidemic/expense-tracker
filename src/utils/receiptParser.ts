// Receipt parsing utilities for extracting expense data from receipt images/PDFs
import * as pdfjsLib from "pdfjs-dist";

export interface ParsedReceiptData {
  description: string;
  amount: string;
  date: string;
  category: string;
  confidence: number;
}

export abstract class BaseReceiptParser {
  abstract canParse(text: string, fileName: string): boolean;
  abstract parse(text: string, fileName: string): ParsedReceiptData | null;
  protected abstract getServiceName(): string;
  protected abstract getDefaultCategory(): string;

  protected extractDateFromFileName(fileName: string): string | null {
    try {
      const match = fileName.match(/Receipt_(\d{2})(\w{3})(\d{4})/);
      if (match) {
        const day = match[1];
        const monthStr = match[2];
        const year = match[3];

        const monthMap: { [key: string]: string } = {
          Jan: "01",
          Feb: "02",
          Mar: "03",
          Apr: "04",
          May: "05",
          Jun: "06",
          Jul: "07",
          Aug: "08",
          Sep: "09",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        };

        const month = monthMap[monthStr];
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  protected getCurrentDate(): string {
    return new Date().toISOString().split("T")[0];
  }
}

// Helper function for filename date extraction outside of classes
function extractDateFromFileName(fileName: string): string | null {
  try {
    const match = fileName.match(/Receipt_(\d{2})(\w{3})(\d{4})/);
    if (match) {
      const day = match[1];
      const monthStr = match[2];
      const year = match[3];

      const monthMap: { [key: string]: string } = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };

      const month = monthMap[monthStr];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export class UberEatsReceiptParser extends BaseReceiptParser {
  canParse(text: string, fileName: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Direct UberEats mentions
    if (
      lowerText.includes("uber eats") ||
      lowerText.includes("ubereats") ||
      lowerFileName.includes("ubereats")
    ) {
      return true;
    }

    // Common UberEats patterns for backwards compatibility
    if (lowerText.includes("you ordered from") && lowerText.includes("total")) {
      return true;
    }

    if (lowerText.includes("receipt from") && lowerText.includes("total")) {
      return true;
    }

    // Filename patterns that suggest UberEats
    if (lowerFileName.includes("receipt_") && lowerFileName.includes(".pdf")) {
      return true;
    }

    return false;
  }

  protected getServiceName(): string {
    return "UberEats";
  }

  protected getDefaultCategory(): string {
    return "Food & Dining";
  }

  parse(text: string, fileName: string): ParsedReceiptData | null {
    try {
      const cleanText = text.replace(/\s+/g, " ").trim();

      let amount = "";
      const totalPatterns = [
        /Total\s+CA\$(\d+\.\d{2})/i,
        /Total CA\$(\d+\.\d{2})/i,
        /CA\$(\d+\.\d{2})\s*You\s+ordered/i,
        /Total\s+\$(\d+\.\d{2})/i,
        /Total \$(\d+\.\d{2})/i,
        /\$(\d+\.\d{2})\s*You\s+ordered/i,
        /\$(\d+\.\d{2})\s*(?:Visa|Mastercard|Card|Payment)/i,
        /Total:\s*\$(\d+\.\d{2})/i,
        /Grand\s+Total\s*\$(\d+\.\d{2})/i,
        /Amount\s+Charged\s*\$(\d+\.\d{2})/i,
      ];

      for (const pattern of totalPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          amount = match[1];
          console.log("Found amount:", amount);
          break;
        }
      }

      let description = "";
      const restaurantLocationPatterns = [
        /Here's your receipt from (.+?) and Uber Eats/i,
        /receipt from (.+?) and Uber Eats/i,
        /You ordered from (.+?)(?:\s+Picked up|\s*$)/i,
        /Order from (.+?)(?:\s|$)/i,
        /(.+?)\s+Order/i,
        /Receipt\s+(.+?)(?:\s+\d+|\s*$)/i,
      ];

      let restaurantName = "";
      let location = "";

      for (const pattern of restaurantLocationPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          const fullRestaurantInfo = match[1].trim();

          const parenMatch = fullRestaurantInfo.match(
            /^([^(]+)\s*\(([^)]+)\)$/
          );
          if (parenMatch) {
            restaurantName = parenMatch[1].trim();
            location = parenMatch[2].trim();
            console.log(
              "Found restaurant with location:",
              restaurantName,
              location
            );
          } else {
            restaurantName = fullRestaurantInfo;
            console.log("Found restaurant name:", restaurantName);
          }
          break;
        }
      }

      if (!location) {
        const addressPatterns = [
          /Picked up from\s+(.+?)(?:\s+Delivered to)/i,
          /(\d+\s+[^,]+(?:Ave|St|Street|Avenue|Road|Rd|Blvd|Boulevard|Drive|Dr|Lane|Ln|Way)[^,]*)/i,
          /Delivery address:\s*(.+?)(?:\n|\r|$)/i,
          /Address:\s*(.+?)(?:\n|\r|$)/i,
          /([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/i,
        ];

        for (const pattern of addressPatterns) {
          const match = cleanText.match(pattern);
          if (match) {
            const fullAddress = match[1].trim();
            const addressParts = fullAddress.split(",");
            location = addressParts[0].trim();
            console.log("Found location from address:", location);
            break;
          }
        }
      }

      if (restaurantName && location) {
        description = `${restaurantName} (${location})`;
      } else if (restaurantName) {
        description = restaurantName;
      } else {
        description = "UberEats Order";
      }

      let date = "";
      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
      ];

      for (const pattern of datePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          try {
            let parsedDate: Date;
            if (pattern === datePatterns[0]) {
              const monthName = match[1];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              const monthIndex = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].indexOf(monthName);
              parsedDate = new Date(year, monthIndex, day);
            } else {
              parsedDate = new Date(match[1]);
            }

            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split("T")[0];
              console.log("Found date:", date);
              break;
            }
          } catch {
            console.log("Could not parse date:", match[1]);
          }
        }
      }

      if (!date) {
        date = this.extractDateFromFileName(fileName) || this.getCurrentDate();
      }

      if (!amount) {
        console.log("Could not extract amount from receipt text");
        return null;
      }

      return {
        description,
        amount,
        date,
        category: this.getDefaultCategory(),
        confidence: 0.9,
      };
    } catch (error) {
      console.error("Error parsing UberEats text:", error);
      return null;
    }
  }
}

export class DoorDashReceiptParser extends BaseReceiptParser {
  canParse(text: string, fileName: string): boolean {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("doordash") ||
      lowerText.includes("door dash") ||
      fileName.toLowerCase().includes("doordash")
    );
  }

  protected getServiceName(): string {
    return "DoorDash";
  }

  protected getDefaultCategory(): string {
    return "Food & Dining";
  }

  parse(text: string, fileName: string): ParsedReceiptData | null {
    try {
      // console.log("Parsing DoorDash text:", text.substring(0, 1000));

      const cleanText = text.replace(/\s+/g, " ").trim();

      let amount = "";
      const totalPatterns = [
        /Total:\s*(?:CA\$|\$)(\d+\.\d{2})/i,
        /Total Charged\s+(?:CA\$|\$)(\d+\.\d{2})/i,
        /Total\s+(?:CA\$|\$)(\d+\.\d{2})/i,
        /Total:\s*\$(\d+\.\d{2})/i,
        /Total\s+\$(\d+\.\d{2})/i,
        /Grand\s+Total\s*\$(\d+\.\d{2})/i,
        /Order\s+Total\s*\$(\d+\.\d{2})/i,
        /\$(\d+\.\d{2})\s*(?:Total|Charged|Paid)/i,
        /Amount\s*\$(\d+\.\d{2})/i,
      ];

      for (const pattern of totalPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          amount = match[1];
          console.log("Found amount:", amount);
          break;
        }
      }

      let description = "";
      const restaurantPatterns = [
        /Order Confirmation for \w+ from (.+?)$/im,
        /Subject:\s*Order Confirmation for \w+ from (.+?)$/im,
        /Paid with .+?\d{4}\s+(.+?)\s+Total:/i, // Visa Ending in 1234 Restuarant
        /Paid with Apple Pay\s+(.+?)\s+Total:/i, // Apple Pay Restaurant
        /Paid with .+?\s+(.+?)\s+Total:/i, // Other payment methods
        /(.+?)\s+Total:/i,
        /from\s+(.+?)(?:\s+Total|\s+Order|\s*$)/i,
        /Restaurant:\s*(.+?)(?:\n|\r|$)/i,
        /Delivery\s+from\s+(.+?)(?:\n|\r|$)/i,
      ];

      let restaurantName = "";

      for (const pattern of restaurantPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          restaurantName = match[1].trim();
          console.log("Found restaurant name:", restaurantName);
          break;
        }
      }

      if (restaurantName) {
        description = restaurantName;
      } else {
        description = "DoorDash Order";
      }

      let date = "";
      const datePatterns = [
        /Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+at\s+\d{1,2}:\d{2}:\d{2}/i,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
      ];

      for (const pattern of datePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          try {
            let parsedDate: Date;
            if (pattern === datePatterns[0]) {
              // Handle "Date: Mar 5, 2025" format
              const monthAbbr = match[1];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              const monthMap: { [key: string]: number } = {
                Jan: 0,
                Feb: 1,
                Mar: 2,
                Apr: 3,
                May: 4,
                Jun: 5,
                Jul: 6,
                Aug: 7,
                Sep: 8,
                Oct: 9,
                Nov: 10,
                Dec: 11,
              };
              const monthIndex = monthMap[monthAbbr];
              if (monthIndex !== undefined) {
                parsedDate = new Date(year, monthIndex, day);
              } else {
                continue;
              }
            } else if (pattern === datePatterns[1]) {
              // Handle "Mar 5, 2025 at" format
              const monthAbbr = match[1];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              const monthMap: { [key: string]: number } = {
                Jan: 0,
                Feb: 1,
                Mar: 2,
                Apr: 3,
                May: 4,
                Jun: 5,
                Jul: 6,
                Aug: 7,
                Sep: 8,
                Oct: 9,
                Nov: 10,
                Dec: 11,
              };
              const monthIndex = monthMap[monthAbbr];
              if (monthIndex !== undefined) {
                parsedDate = new Date(year, monthIndex, day);
              } else {
                continue;
              }
            } else if (pattern === datePatterns[2]) {
              // Handle full month names
              const monthName = match[1];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              const monthIndex = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].indexOf(monthName);
              parsedDate = new Date(year, monthIndex, day);
            } else if (pattern === datePatterns[5]) {
              const month = parseInt(match[1]);
              const day = parseInt(match[2]);
              let year = parseInt(match[3]);
              if (year < 100) year += 2000;
              parsedDate = new Date(year, month - 1, day);
            } else {
              parsedDate = new Date(match[1]);
            }

            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split("T")[0];
              console.log("Found date:", date);
              break;
            }
          } catch {
            console.log("Could not parse date:", match[1]);
          }
        }
      }

      if (!date) {
        console.log("No date found in text, checking filename:", fileName);
        date = this.extractDateFromFileName(fileName) || this.getCurrentDate();
        console.log("Final date used:", date);
      }

      if (!amount) {
        console.log("Could not extract amount from DoorDash receipt text");
        return null;
      }

      return {
        description,
        amount,
        date,
        category: this.getDefaultCategory(),
        confidence: 0.9,
      };
    } catch (error) {
      console.error("Error parsing DoorDash text:", error);
      return null;
    }
  }
}

export class ReceiptParserFactory {
  private static parsers: BaseReceiptParser[] = [
    new UberEatsReceiptParser(),
    new DoorDashReceiptParser(),
  ];

  static findParser(text: string, fileName: string): BaseReceiptParser | null {
    for (const parser of this.parsers) {
      if (parser.canParse(text, fileName)) {
        return parser;
      }
    }
    return null;
  }

  static registerParser(parser: BaseReceiptParser): void {
    this.parsers.push(parser);
  }
}

export async function parseReceiptFile(
  file: File
): Promise<ParsedReceiptData | null> {
  try {
    if (file.type === "application/pdf") {
      return await parsePDFWithPDFJS(file);
    } else if (file.type.startsWith("image/")) {
      console.log("Image parsing not yet implemented - PDF parsing only");
      return null;
    }

    return null;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return null;
  }
}

async function parsePDFWithPDFJS(
  file: File
): Promise<ParsedReceiptData | null> {
  try {
    // Configure PDF.js worker with proper CDN URL to avoid CORS issues
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
    });
    const pdf = await loadingTask.promise;

    let fullText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extract text items and join them
      const pageText = textContent.items
        .map((item) => {
          if ("str" in item) {
            return item.str;
          }
          return "";
        })
        .join(" ");

      fullText += pageText + " ";
    }

    // Use the parser factory to find the appropriate parser
    const parser = ReceiptParserFactory.findParser(fullText, file.name);
    if (parser) {
      return parser.parse(fullText, file.name);
    } else {
      console.log(
        "No suitable parser found for receipt, attempting generic fallback"
      );
      // Fallback: create basic template with filename date
      const date =
        extractDateFromFileName(file.name) ||
        new Date().toISOString().split("T")[0];
      return {
        description: "Receipt",
        amount: "",
        date: date,
        category: "Miscellaneous",
        confidence: 0.3,
      };
    }
  } catch (error) {
    console.error("Error parsing PDF with PDF.js:", error);

    // Fallback: create template with date from filename
    const date =
      extractDateFromFileName(file.name) ||
      new Date().toISOString().split("T")[0];
    return {
      description: "UberEats Order",
      amount: "",
      date: date,
      category: "Food & Dining",
      confidence: 0.3,
    };
  }
}

export function isValidReceiptFile(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  return validTypes.includes(file.type) && file.size <= maxSize;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
