import { BaseReceiptParser } from "./baseReceiptParser";
import { ParsedReceiptData } from "./receiptParser";

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

      const amount = this.extractAmountFromText(text, totalPatterns);

      const restaurantPatterns = [
        /Order Confirmation for \w+ from (.+?)$/im,
        /Subject:\s*Order Confirmation for \w+ from (.+?)$/im,
        /Paid with .+?\d{4}\s+(.+?)\s+Total:/i,
        /Paid with Apple Pay\s+(.+?)\s+Total:/i,
        /Paid with .+?\s+(.+?)\s+Total:/i,
        /(.+?)\s+Total:/i,
        /from\s+(.+?)(?:\s+Total|\s+Order|\s*$)/i,
        /Restaurant:\s*(.+?)(?:\n|\r|$)/i,
        /Delivery\s+from\s+(.+?)(?:\n|\r|$)/i,
      ];

      const restaurantName = this.extractTextFromPatterns(
        text,
        restaurantPatterns
      );
      const description = restaurantName || "DoorDash Order";

      const datePatterns = [
        /Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+at\s+\d{1,2}:\d{2}:\d{2}/i,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
      ];

      const date = this.getDateFromTextOrFileName(text, fileName, datePatterns);

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
