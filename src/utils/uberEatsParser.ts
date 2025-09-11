import { BaseReceiptParser } from "./baseReceiptParser";
import { ParsedReceiptData } from "./receiptParser";

export class UberEatsReceiptParser extends BaseReceiptParser {
  canParse(text: string, fileName: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    if (
      lowerText.includes("uber eats") ||
      lowerText.includes("ubereats") ||
      lowerFileName.includes("ubereats")
    ) {
      return true;
    }

    if (lowerText.includes("you ordered from") && lowerText.includes("total")) {
      return true;
    }

    if (lowerText.includes("receipt from") && lowerText.includes("total")) {
      return true;
    }

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
    return this.parseWithErrorHandling(text, fileName, (text, fileName) => {
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

      const amount = this.extractAmountFromText(text, totalPatterns);

      const restaurantLocationPatterns = [
        /Here's your receipt from (.+?) and Uber Eats/i,
        /receipt from (.+?) and Uber Eats/i,
        /You ordered from (.+?)(?:\s+Picked up|\s*$)/i,
        /Order from (.+?)(?:\s|$)/i,
        /(.+?)\s+Order/i,
        /Receipt\s+(.+?)(?:\s+\d+|\s*$)/i,
      ];

      const description = this.extractVendorName(
        text,
        restaurantLocationPatterns,
        "UberEats Order"
      );

      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
      ];

      const date = this.getDateFromTextOrFileName(text, fileName, datePatterns);

      return this.validateAndCreateResult(description, amount, date);
    });
  }
}
