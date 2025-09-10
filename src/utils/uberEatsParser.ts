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
    try {
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

      const restaurantInfo = this.extractTextFromPatterns(
        text,
        restaurantLocationPatterns
      );
      const description = this.buildDescription(restaurantInfo, text);

      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
      ];

      const date = this.getDateFromTextOrFileName(text, fileName, datePatterns);

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

  private buildDescription(restaurantInfo: string, text: string): string {
    if (!restaurantInfo) {
      return "UberEats Order";
    }

    const parenMatch = restaurantInfo.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (parenMatch) {
      const restaurantName = parenMatch[1].trim();
      const location = parenMatch[2].trim();
      console.log("Found restaurant with location:", restaurantName, location);
      return `${restaurantName} (${location})`;
    }

    const location = this.extractLocation(text);
    if (location) {
      return `${restaurantInfo} (${location})`;
    }

    console.log("Found restaurant name:", restaurantInfo);
    return restaurantInfo;
  }

  private extractLocation(text: string): string {
    const cleanText = this.cleanText(text);
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
        const location = addressParts[0].trim();
        console.log("Found location from address:", location);
        return location;
      }
    }
    return "";
  }
}
