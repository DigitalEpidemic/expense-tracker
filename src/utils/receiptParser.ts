import * as pdfjsLib from "pdfjs-dist";
import { BaseReceiptParser } from "./baseReceiptParser";
import { DoorDashReceiptParser } from "./doorDashParser";
import { UberEatsReceiptParser } from "./uberEatsParser";

export interface ParsedReceiptData {
  description: string;
  amount: string;
  date: string;
  category: string;
  confidence: number;
}

export { BaseReceiptParser };

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
