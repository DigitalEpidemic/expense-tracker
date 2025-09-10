import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Firebase
vi.mock("../config/firebase", () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  },
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock PDF.js
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn().mockResolvedValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: "Mock PDF content" }],
        }),
      }),
    }),
  }),
  GlobalWorkerOptions: {
    workerSrc: "",
  },
}));

// Suppress console logs during tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args: any[]) => {
  const message = args.join(" ");
  // Only suppress specific receiptParser logs during tests
  if (
    message.includes("Image parsing not yet implemented") ||
    message.includes("PDF loaded successfully") ||
    message.includes("Page 1 text:") ||
    message.includes("Page 2 text:") ||
    message.includes("Full extracted text:") ||
    message.includes("Parsing UberEats text:") ||
    message.includes("Found amount:") ||
    message.includes("Found restaurant") ||
    message.includes("Found date:") ||
    message.includes("Found location from address:") ||
    message.includes("Could not extract amount from receipt text") ||
    message.includes("Successfully parsed receipt:")
  ) {
    return;
  }
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  const message = args.join(" ");
  // Keep intentional test error logs from showing in stderr (these are expected)
  if (
    message.includes("Error parsing PDF with PDF.js:") ||
    message.includes("Error adding expense:") ||
    message.includes("Error updating expense:") ||
    message.includes("Error deleting expense:") ||
    message.includes("Sign in error:") ||
    message.includes("Sign out error:") ||
    message.includes("Failed to parse receipt:")
  ) {
    return;
  }
  originalConsoleError(...args);
};
