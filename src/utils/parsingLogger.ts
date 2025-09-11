export interface ParsingDebugInfo {
  foundAmount?: string;
  foundTextMatch?: string;
  foundDate?: string;
  failedDateParse?: string;
  dateFromFilename?: { filename: string; finalDate: string };
  foundVendorName?: string;
  amountExtractionFailed?: string;
  imageParsingNotImplemented?: boolean;
  genericFallback?: boolean;
}

export class ParsingLogger {
  private static debugInfo: ParsingDebugInfo = {};

  static reset(): void {
    this.debugInfo = {};
  }

  static getDebugInfo(): ParsingDebugInfo {
    return { ...this.debugInfo };
  }

  static logAmount(amount: string): void {
    this.debugInfo.foundAmount = amount;
  }

  static logTextMatch(text: string): void {
    this.debugInfo.foundTextMatch = text;
  }

  static logFoundDate(date: string): void {
    this.debugInfo.foundDate = date;
  }

  static logFailedDateParse(dateText: string): void {
    this.debugInfo.failedDateParse = dateText;
  }

  static logDateFromFilename(filename: string, finalDate: string): void {
    this.debugInfo.dateFromFilename = { filename, finalDate };
  }

  static logVendorName(name: string): void {
    this.debugInfo.foundVendorName = name;
  }

  static logAmountExtractionFailed(serviceName: string): void {
    this.debugInfo.amountExtractionFailed = serviceName;
  }

  static logImageParsingNotImplemented(): void {
    this.debugInfo.imageParsingNotImplemented = true;
  }

  static logGenericFallback(): void {
    this.debugInfo.genericFallback = true;
  }
}
