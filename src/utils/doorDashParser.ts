import { BaseReceiptParser } from "./baseReceiptParser";
import { ParsedReceiptData } from "./receiptParser";

export const DOOR_DASH_PATTERNS = {
  totalPatterns: [
    /Dasher Tip\s+CA\$[\d.]+\s+Total\s+CA\$(\d+\.\d{2})/i,
    /Total\s+CA\$(\d+\.\d{2})(?:\s+Address|\s*$)/i,
    /Total:\s*(?:CA\$|\$)(\d+\.\d{2})/i,
    /Total Charged\s+(?:CA\$|\$)(\d+\.\d{2})/i,
    /Total\s+(?:CA\$|\$)(\d+\.\d{2})/i,
    /Total:\s*\$(\d+\.\d{2})/i,
    /Total\s+\$(\d+\.\d{2})/i,
    /Grand\s+Total\s*\$(\d+\.\d{2})/i,
    /Order\s+Total\s*\$(\d+\.\d{2})/i,
    /\$(\d+\.\d{2})\s*(?:Total|Charged|Paid)/i,
    /Amount\s*\$(\d+\.\d{2})/i,
  ],
  restaurantPatterns: [
    /Your Dasher\s+\w+\s+([^0-9]+?)\s+\d+\s+Item/i,
    /Order Confirmation for \w+ from (.+?)$/im,
    /Subject:\s*Order Confirmation for \w+ from (.+?)$/im,
    /Paid with .+?\d{4}\s+(.+?)\s+Total:/i,
    /Paid with Apple Pay\s+(.+?)\s+Total:/i,
    /Paid with .+?\s+(.+?)\s+Total:/i,
    /(.+?)\s+Total:/i,
    /from\s+(.+?)(?:\s+Total|\s+Order|\s*$)/i,
    /Restaurant:\s*(.+?)(?:\n|\r|$)/i,
    /Delivery\s+from\s+(.+?)(?:\n|\r|$)/i,
  ],
  datePatterns: [
    /Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+at\s+\d{1,2}:\d{2}:\d{2}/i,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
  ],
};

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
    return this.parseWithErrorHandling(text, fileName, (text, fileName) => {
      const amount = this.extractAmountFromText(
        text,
        DOOR_DASH_PATTERNS.totalPatterns
      );

      const description = this.extractVendorName(
        text,
        DOOR_DASH_PATTERNS.restaurantPatterns,
        "DoorDash Order"
      );

      const date = this.getDateFromTextOrFileName(
        text,
        fileName,
        DOOR_DASH_PATTERNS.datePatterns
      );

      return this.validateAndCreateResult(description, amount, date);
    });
  }
}
