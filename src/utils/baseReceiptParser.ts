import { ParsedReceiptData } from "./receiptParser";

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

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  protected extractAmountFromText(text: string, patterns: RegExp[]): string {
    const cleanText = this.cleanText(text);

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        console.log("Found amount:", match[1]);
        return match[1];
      }
    }
    return "";
  }

  protected extractTextFromPatterns(text: string, patterns: RegExp[]): string {
    const cleanText = this.cleanText(text);

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        console.log("Found text match:", match[1]);
        return match[1].trim();
      }
    }
    return "";
  }

  protected parseDateFromText(text: string, patterns: RegExp[]): string {
    const cleanText = this.cleanText(text);

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        try {
          const parsedDate = this.parseMatchedDate(match, pattern, patterns);
          if (!isNaN(parsedDate.getTime())) {
            const date = parsedDate.toISOString().split("T")[0];
            console.log("Found date:", date);
            return date;
          }
        } catch {
          console.log("Could not parse date:", match[1]);
        }
      }
    }
    return "";
  }

  private parseMatchedDate(
    match: RegExpMatchArray,
    pattern: RegExp,
    patterns: RegExp[]
  ): Date {
    const monthNamePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    ];

    const monthAbbrPatterns = [
      /Date:\s*(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\w{3})\s+(\d{1,2}),?\s+(\d{4})\s+at\s+\d{1,2}:\d{2}:\d{2}/i,
    ];

    const dateSlashPatterns = [/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/];

    if (monthNamePatterns.includes(pattern)) {
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
      return new Date(year, monthIndex, day);
    }

    if (monthAbbrPatterns.includes(pattern)) {
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
        return new Date(year, monthIndex, day);
      }
    }

    if (dateSlashPatterns.includes(pattern)) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      return new Date(year, month - 1, day);
    }

    return new Date(match[1]);
  }

  protected getDateFromTextOrFileName(
    text: string,
    fileName: string,
    patterns: RegExp[]
  ): string {
    let date = this.parseDateFromText(text, patterns);

    if (!date) {
      console.log("No date found in text, checking filename:", fileName);
      date = this.extractDateFromFileName(fileName) || this.getCurrentDate();
      console.log("Final date used:", date);
    }

    return date;
  }
}
