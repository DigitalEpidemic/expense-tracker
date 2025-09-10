import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ExpenseFormData } from "../types/expense";
import ExpenseForm from "./ExpenseForm";

// Mock the receipt parser
vi.mock("../utils/receiptParser", () => ({
  parseReceiptFile: vi.fn(),
  isValidReceiptFile: vi.fn(),
  formatFileSize: vi.fn(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Import mocked functions
import toast from "react-hot-toast";
import {
  formatFileSize,
  isValidReceiptFile,
  parseReceiptFile,
} from "../utils/receiptParser";

const mockParseReceiptFile = vi.mocked(parseReceiptFile);
const mockIsValidReceiptFile = vi.mocked(isValidReceiptFile);
const mockFormatFileSize = vi.mocked(formatFileSize);
const mockToast = vi.mocked(toast);

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  title: "Add New Expense",
};

describe("ExpenseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidReceiptFile.mockReturnValue(true);
    mockFormatFileSize.mockReturnValue("1.5 MB");
  });

  it("does not render when isOpen is false", () => {
    render(<ExpenseForm {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Add New Expense")).not.toBeInTheDocument();
  });

  it("renders form when isOpen is true", () => {
    render(<ExpenseForm {...defaultProps} />);

    expect(screen.getByText("Add New Expense")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter expense description")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("populates form with initial data", () => {
    const initialData: ExpenseFormData = {
      description: "Test expense",
      amount: "25.99",
      date: "2024-01-15",
      category: "Food & Dining",
      reimbursed: true,
    };

    render(<ExpenseForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByDisplayValue("Test expense")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25.99")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-01-15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Food & Dining")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("handles form input changes", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    const descriptionInput = screen.getByPlaceholderText(
      "Enter expense description"
    );
    const amountInput = screen.getByPlaceholderText("0.00");
    const categorySelect = screen.getByRole("combobox");

    await user.type(descriptionInput, "Coffee");
    await user.type(amountInput, "4.99");
    await user.selectOptions(categorySelect, "Food & Dining");

    expect(descriptionInput).toHaveValue("Coffee");
    expect(amountInput).toHaveValue(4.99);
    expect(categorySelect).toHaveValue("Food & Dining");
  });

  it("calls onSubmit with form data when form is valid", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<ExpenseForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("Enter expense description"),
      "Coffee"
    );
    await user.type(screen.getByPlaceholderText("0.00"), "4.99");
    await user.selectOptions(screen.getByRole("combobox"), "Food & Dining");

    await user.click(screen.getByText("Save"));

    expect(onSubmit).toHaveBeenCalledWith({
      description: "Coffee",
      amount: "4.99",
      date: expect.any(String),
      category: "Food & Dining",
      reimbursed: false,
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ExpenseForm {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("handles file upload", async () => {
    mockParseReceiptFile.mockResolvedValue({
      description: "Restaurant ABC",
      amount: "15.99",
      date: "2024-01-15",
      category: "Food & Dining",
      confidence: 0.9,
    });

    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    const file = new File(["receipt"], "receipt.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.getElementById(
      "receipt-upload"
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockParseReceiptFile).toHaveBeenCalledWith(file);
    });
  });

  it("filters out invalid files", async () => {
    // Reset all mocks and set up the invalid file mock
    vi.clearAllMocks();
    mockIsValidReceiptFile.mockReturnValue(false);
    mockFormatFileSize.mockReturnValue("1.5 MB");

    render(<ExpenseForm {...defaultProps} />);

    const file = new File(["invalid"], "invalid.txt", { type: "text/plain" });
    const fileInput = document.getElementById(
      "receipt-upload"
    ) as HTMLInputElement;

    // Manually trigger the file upload processing by dispatching a change event
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await waitFor(
      () => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Please upload valid image files (JPG, PNG, WebP) or PDF files under 10MB."
        );
      },
      { timeout: 3000 }
    );
  });

  it("handles drag and drop", async () => {
    mockParseReceiptFile.mockResolvedValue({
      description: "Restaurant ABC",
      amount: "15.99",
      date: "2024-01-15",
      category: "Food & Dining",
      confidence: 0.9,
    });

    render(<ExpenseForm {...defaultProps} />);

    const dropArea = screen.getByText(
      /click to upload or drag and drop/i
    ).parentElement;
    const file = new File(["receipt"], "receipt.pdf", {
      type: "application/pdf",
    });

    // Simulate drop
    fireEvent.drop(dropArea!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockParseReceiptFile).toHaveBeenCalledWith(file);
    });
  });
});
