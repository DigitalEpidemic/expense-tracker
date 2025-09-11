import "@testing-library/jest-dom";
import { vi } from "vitest";

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

vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => null,
}));

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

const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
  const message = args.join(" ");
  if (
    message.includes("Error parsing PDF with PDF.js:") ||
    message.includes("Error adding expense:") ||
    message.includes("Error updating expense:") ||
    message.includes("Error deleting expense:") ||
    message.includes("Sign in error:") ||
    message.includes("Sign out error:") ||
    message.includes("Failed to parse receipt:") ||
    message.includes("Error marking expenses as reimbursed:")
  ) {
    return;
  }
  originalConsoleError(...args);
};
