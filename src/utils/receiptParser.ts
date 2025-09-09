// Receipt parsing utilities for extracting expense data from receipt images/PDFs
import * as pdfjsLib from 'pdfjs-dist';

export interface ParsedReceiptData {
  description: string;
  amount: string;
  date: string;
  category: string;
  confidence: number;
}

export async function parseReceiptFile(file: File): Promise<ParsedReceiptData | null> {
  try {
    if (file.type === 'application/pdf') {
      return await parsePDFWithPDFJS(file);
    } else if (file.type.startsWith('image/')) {
      console.log('Image parsing not yet implemented - PDF parsing only');
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing receipt:', error);
    return null;
  }
}

async function parsePDFWithPDFJS(file: File): Promise<ParsedReceiptData | null> {
  try {
    // Configure PDF.js worker with proper CDN URL to avoid CORS issues
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer
    });
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded successfully, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      
      fullText += pageText + ' ';
      console.log(`Page ${pageNum} text:`, pageText);
    }
    
    console.log('Full extracted text:', fullText);
    
    // Parse the extracted text for UberEats patterns
    return parseUberEatsText(fullText, file.name);
  } catch (error) {
    console.error('Error parsing PDF with PDF.js:', error);
    
    // Fallback: create template with date from filename
    const date = extractDateFromFileName(file.name) || new Date().toISOString().split('T')[0];
    return {
      description: 'UberEats Order',
      amount: '',
      date: date,
      category: 'Food & Dining',
      confidence: 0.3
    };
  }
}

function parseUberEatsText(text: string, fileName: string): ParsedReceiptData | null {
  try {
    console.log('Parsing UberEats text:', text.substring(0, 500));
    
    // Clean up the text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Extract total amount
    let amount = '';
    const totalPatterns = [
      /Total\s+CA\$(\d+\.\d{2})/i,
      /Total CA\$(\d+\.\d{2})/i,
      /CA\$(\d+\.\d{2})\s*You\s+ordered/i,
      /CA\$(\d+\.\d{2})\s*Simplii\s+Visa/i
    ];
    
    for (const pattern of totalPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        amount = match[1];
        console.log('Found amount:', amount);
        break;
      }
    }
    
    // Extract restaurant name and location
    let description = '';
    
    // Look for restaurant name and location in one pattern to avoid duplicates
    const restaurantLocationPatterns = [
      /Here's your receipt from (.+?) and Uber Eats/i,
      /receipt from (.+?) and Uber Eats/i,
      /You ordered from (.+?)(?:\s+Picked up|\s*$)/i
    ];
    
    let restaurantName = '';
    let location = '';
    
    // First try to get restaurant name
    for (const pattern of restaurantLocationPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const fullRestaurantInfo = match[1].trim();
        
        // Check if the restaurant info already contains address in parentheses
        const parenMatch = fullRestaurantInfo.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (parenMatch) {
          restaurantName = parenMatch[1].trim();
          location = parenMatch[2].trim();
          console.log('Found restaurant with location:', restaurantName, location);
        } else {
          restaurantName = fullRestaurantInfo;
          console.log('Found restaurant name:', restaurantName);
        }
        break;
      }
    }
    
    // If we don't have location yet, try to extract it from pickup address
    if (!location) {
      const addressPatterns = [
        /Picked up from\s+(.+?)(?:\s+Delivered to)/i,
        /(\d+\s+[^,]+(?:Ave|St|Street|Avenue|Road|Rd|Blvd|Drive|Dr|Weber)[^,]*)/i
      ];
      
      for (const pattern of addressPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          const fullAddress = match[1].trim();
          // Clean up address - take first part before postal code
          const addressParts = fullAddress.split(',');
          location = addressParts[0].trim();
          console.log('Found location from address:', location);
          break;
        }
      }
    }
    
    // Combine restaurant and location
    if (restaurantName && location) {
      description = `${restaurantName} (${location})`;
    } else if (restaurantName) {
      description = restaurantName;
    } else {
      description = 'UberEats Order';
    }
    
    // Extract date
    let date = '';
    const datePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        try {
          let parsedDate: Date;
          if (pattern === datePatterns[0]) {
            // Month name format
            const monthName = match[1];
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);
            parsedDate = new Date(year, monthIndex, day);
          } else {
            parsedDate = new Date(match[1]);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            console.log('Found date:', date);
            break;
          }
        } catch {
          console.log('Could not parse date:', match[1]);
        }
      }
    }
    
    // Fallback: extract date from filename
    if (!date) {
      date = extractDateFromFileName(fileName) || new Date().toISOString().split('T')[0];
    }
    
    // Validate we found at least the amount
    if (!amount) {
      console.log('Could not extract amount from receipt text');
      return null;
    }
    
    console.log('Successfully parsed receipt:', { description, amount, date });
    
    return {
      description,
      amount,
      date,
      category: 'Food & Dining',
      confidence: 0.9
    };
  } catch (error) {
    console.error('Error parsing UberEats text:', error);
    return null;
  }
}

function extractDateFromFileName(fileName: string): string | null {
  try {
    const match = fileName.match(/Receipt_(\d{2})(\w{3})(\d{4})/);
    if (match) {
      const day = match[1];
      const monthStr = match[2];
      const year = match[3];
      
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
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

export function isValidReceiptFile(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}