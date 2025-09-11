import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Expense } from "../types/expense";
import ReimbursementModal from "./ReimbursementModal";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const createMockExpense = (
  id: string,
  amount: number,
  description: string,
  reimbursed = false
): Expense => ({
  id,
  description,
  amount,
  date: "2025-01-15",
  category: "Food & Dining",
  reimbursed,
  userId: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockExpenses = [
  createMockExpense("1", 25.5, "Lunch at Cafe"),
  createMockExpense("2", 15.75, "Coffee"),
  createMockExpense("3", 50.0, "Dinner", false),
  createMockExpense("4", 100.0, "Hotel", true), // already reimbursed
];

describe("ReimbursementModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    expenses: mockExpenses,
    onMarkReimbursed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    render(<ReimbursementModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Match Reimbursements")).not.toBeInTheDocument();
  });

  it("should render modal header and description", () => {
    render(<ReimbursementModal {...defaultProps} />);

    expect(screen.getByText("Match Reimbursements")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Enter your reimbursement total to find matching expense combinations and bulk mark them as reimbursed/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Matches prioritize oldest expenses first/)
    ).toBeInTheDocument();
  });

  it("should display pending expenses count in initial state", () => {
    render(<ReimbursementModal {...defaultProps} />);

    // Should show 3 pending expenses (excluding the reimbursed one)
    expect(screen.getByText(/You have 3 pending expense/)).toBeInTheDocument();
    expect(screen.getByText(/totaling \$91\.25/)).toBeInTheDocument();
  });

  it("should handle close button click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReimbursementModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole("button", {
      name: "Close reimbursement modal",
    });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should allow entering target amount", async () => {
    const user = userEvent.setup();
    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    await user.type(input, "25.50");

    expect(input).toHaveValue(25.5);
  });

  it("should show error for invalid amount", async () => {
    const user = userEvent.setup();
    const toast = await import("react-hot-toast");

    render(<ReimbursementModal {...defaultProps} />);

    // Enter invalid amount
    const input = screen.getByPlaceholderText("168.60");
    await user.type(input, "0");

    const findButton = screen.getByRole("button", { name: "Find matches" });
    await user.click(findButton);

    expect(toast.default.error).toHaveBeenCalledWith(
      "Please enter a valid amount"
    );
  });

  it("should search for matches when find button is clicked", async () => {
    const user = userEvent.setup();
    const toast = await import("react-hot-toast");

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    // Should show searching state
    expect(
      screen.getByRole("button", { name: "Searching for matches" })
    ).toBeInTheDocument();

    // Wait for search to complete
    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith(
        "Found 1 possible match"
      );
    });
  });

  it("should search for matches when Enter is pressed", async () => {
    const user = userEvent.setup();
    const toast = await import("react-hot-toast");

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    await user.type(input, "25.50");

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith(
        "Found 1 possible match"
      );
    });
  });

  it("should display no matches found message", async () => {
    const user = userEvent.setup();
    const toast = await import("react-hot-toast");

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "999.99"); // Amount that won't match
    await user.click(findButton);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        "No matching expense combinations found"
      );
    });

    await waitFor(() => {
      expect(screen.getByText("No matches found")).toBeInTheDocument();
    });
  });

  it("should display found matches", async () => {
    const user = userEvent.setup();

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText("Found 1 possible match")).toBeInTheDocument();
    });

    // Should show the match
    expect(screen.getByText("1 expense (exact match)")).toBeInTheDocument();
    expect(
      screen.getByText("Lunch at Cafe (Wed, Jan 15, 2025)")
    ).toBeInTheDocument(); // Appears in match summary with date
    expect(screen.getByText("Lunch at Cafe")).toBeInTheDocument(); // Appears in selected details without date
    expect(screen.getAllByText("$25.50")).toHaveLength(1); // Appears in match button
  });

  it("should allow selecting a match", async () => {
    const user = userEvent.setup();

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText("Found 1 possible match")).toBeInTheDocument();
    });

    // Should automatically select first match and show selected expenses
    expect(screen.getByText(/Selected Match \(/)).toBeInTheDocument();
    expect(screen.getByText("Total: $25.50")).toBeInTheDocument();
  });

  it("should mark expenses as reimbursed", async () => {
    const user = userEvent.setup();
    const onMarkReimbursed = vi.fn().mockResolvedValue(undefined);
    const toast = await import("react-hot-toast");

    render(
      <ReimbursementModal
        {...defaultProps}
        onMarkReimbursed={onMarkReimbursed}
      />
    );

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Selected Match \(/)).toBeInTheDocument();
    });

    const markButton = screen.getByRole("button", {
      name: /Mark 1 Expense as Reimbursed/,
    });
    await user.click(markButton);

    expect(onMarkReimbursed).toHaveBeenCalledWith(["1"]);

    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith(
        "Marked 1 expense as reimbursed"
      );
    });
  });

  it("should handle multiple expense matches", async () => {
    const user = userEvent.setup();

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    // This should match lunch + coffee (25.50 + 15.75 = 41.25)
    await user.type(input, "41.25");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Found .+ possible match/)).toBeInTheDocument();
    });

    // Should show combined match
    await waitFor(() => {
      expect(screen.getByText(/Selected Match \(/)).toBeInTheDocument();
    });

    const markButton = screen.getByRole("button", {
      name: /Mark .+ Expenses as Reimbursed/,
    });
    expect(markButton).toBeInTheDocument();
  });

  it("should handle reimbursement error", async () => {
    const user = userEvent.setup();
    const onMarkReimbursed = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
    const toast = await import("react-hot-toast");

    render(
      <ReimbursementModal
        {...defaultProps}
        onMarkReimbursed={onMarkReimbursed}
      />
    );

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Selected Match \(/)).toBeInTheDocument();
    });

    const markButton = screen.getByRole("button", {
      name: /Mark 1 Expense as Reimbursed/,
    });
    await user.click(markButton);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        "Failed to mark expenses as reimbursed"
      );
    });
  });

  it("should reset state when modal is closed and reopened", async () => {
    const { rerender } = render(<ReimbursementModal {...defaultProps} />);

    // Close modal
    rerender(<ReimbursementModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<ReimbursementModal {...defaultProps} isOpen={true} />);

    // Should be back to initial state
    expect(screen.getByText("Ready to find matches")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("168.60")).toHaveValue(null);
  });

  it("should disable search when no amount is entered", () => {
    render(<ReimbursementModal {...defaultProps} />);

    const findButton = screen.getByRole("button", { name: "Find matches" });
    expect(findButton).toBeDisabled();
  });

  it("should disable input and button while searching", async () => {
    const user = userEvent.setup();

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    // During search
    expect(input).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Searching for matches" })
    ).toBeDisabled();
  });

  it("should show expense details in selected match", async () => {
    const user = userEvent.setup();

    render(<ReimbursementModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "25.50");
    await user.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Selected Match \(/)).toBeInTheDocument();
    });

    // Should show expense details
    expect(
      screen.getByText("Lunch at Cafe (Wed, Jan 15, 2025)")
    ).toBeInTheDocument(); // Appears in match summary with date
    expect(screen.getByText("Lunch at Cafe")).toBeInTheDocument(); // Appears in selected details without date
    expect(
      screen.getByText(/Wed, Jan 15, 2025 • \$25\.50/)
    ).toBeInTheDocument();
    expect(screen.getByText("$25.50")).toBeInTheDocument();
  });

  it("should truncate long expense lists in match summaries", async () => {
    const user = userEvent.setup();
    const manyExpenses = Array.from({ length: 6 }, (_, i) =>
      createMockExpense(i.toString(), 10, `Expense ${i}`)
    );

    render(<ReimbursementModal {...defaultProps} expenses={manyExpenses} />);

    const input = screen.getByPlaceholderText("168.60");
    const findButton = screen.getByRole("button", { name: "Find matches" });

    await user.type(input, "50.00"); // Should match multiple expenses
    await user.click(findButton);

    await waitFor(() => {
      // Should show truncated description for matches with > 3 expenses
      const summaries = screen.getAllByText(/and \d+ more/);
      expect(summaries.length).toBeGreaterThan(0);
    });
  });
});
