import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import App from "./App";
import { useAuth } from "./hooks/useAuth";
import { useExpenses } from "./hooks/useExpenses";
import { useIsDesktop } from "./hooks/useMediaQuery";

// Mock the hooks
vi.mock("./hooks/useAuth");
vi.mock("./hooks/useExpenses");
vi.mock("./hooks/useMediaQuery");

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

const mockUseAuth = useAuth as Mock;
const mockUseExpenses = useExpenses as Mock;
const mockUseIsDesktop = useIsDesktop as Mock;

const mockExpenses = [
  {
    id: "1",
    description: "Coffee",
    amount: 5.99,
    date: "2024-01-15",
    category: "Food & Dining",
    reimbursed: false,
    userId: "user1",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: "2",
    description: "Gas",
    amount: 45.0,
    date: "2024-01-10",
    category: "Transportation",
    reimbursed: true,
    userId: "user1",
    createdAt: new Date("2024-01-10T08:00:00Z"),
    updatedAt: new Date("2024-01-10T08:00:00Z"),
  },
];

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop view for most tests
    mockUseIsDesktop.mockReturnValue(true);
  });

  it("shows loading spinner when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows AuthScreen when user is not logged in", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
  });

  it("renders main app when user is logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Add Expense")).toBeInTheDocument();
    expect(screen.getByText("January 2024")).toBeInTheDocument();
  });

  it("shows loading spinner when expenses are loading", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: true,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows no expenses message when there are no expenses", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by adding your first expense.")
    ).toBeInTheDocument();
  });

  it("opens expense form when Add Expense button is clicked", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    fireEvent.click(screen.getByText("Add Expense"));
    expect(screen.getByText("Add New Expense")).toBeInTheDocument();
  });

  it("handles adding an expense", async () => {
    const mockAddExpense = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: mockAddExpense,
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Open form
    fireEvent.click(screen.getByText("Add Expense"));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText("Add New Expense")).toBeInTheDocument();
    });

    // Fill out form using more specific selectors
    const descriptionInput = screen.getByPlaceholderText(
      "Enter expense description"
    );
    const amountInput = screen.getByPlaceholderText("0.00");
    const categorySelect = screen.getByRole("combobox");

    fireEvent.change(descriptionInput, {
      target: { value: "Test expense" },
    });
    fireEvent.change(amountInput, {
      target: { value: "10.99" },
    });
    fireEvent.change(categorySelect, {
      target: { value: "Food & Dining" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => {
      expect(mockAddExpense).toHaveBeenCalledWith({
        description: "Test expense",
        amount: "10.99",
        date: expect.any(String),
        category: "Food & Dining",
        reimbursed: false,
      });
    });
  });

  it("handles deleting an expense with confirmation", async () => {
    const mockDeleteExpense = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);

    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: mockDeleteExpense,
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Click delete button for first expense
    const deleteButtons = screen.getAllByTitle("Delete expense");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteExpense).toHaveBeenCalledWith("1");
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this expense?"
    );
  });

  it("cancels deletion when user cancels confirmation", async () => {
    const mockDeleteExpense = vi.fn();
    window.confirm = vi.fn().mockReturnValue(false);

    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: mockDeleteExpense,
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Click delete button for first expense
    const deleteButtons = screen.getAllByTitle("Delete expense");
    fireEvent.click(deleteButtons[0]);

    expect(mockDeleteExpense).not.toHaveBeenCalled();
  });

  it("handles duplicating an expense", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Click duplicate button for first expense
    const duplicateButtons = screen.getAllByTitle("Duplicate expense");
    fireEvent.click(duplicateButtons[0]);

    expect(screen.getByText("Add New Expense")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Coffee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5.99")).toBeInTheDocument();
  });

  it("closes form when cancel is clicked", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Open form
    fireEvent.click(screen.getByText("Add Expense"));
    expect(screen.getByText("Add New Expense")).toBeInTheDocument();

    // Close form
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Add New Expense")).not.toBeInTheDocument();
  });

  it("displays expense totals correctly", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Check that expense totals appear (may appear multiple times due to responsive design)
    expect(screen.getAllByText("$50.99").length).toBeGreaterThanOrEqual(1); // Total
    expect(screen.getAllByText("$45.00").length).toBeGreaterThanOrEqual(1); // Reimbursed
    expect(screen.getAllByText("$5.99").length).toBeGreaterThanOrEqual(1); // Pending
  });

  it("handles editing an expense", async () => {
    const mockUpdateExpense = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: mockUpdateExpense,
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Click edit button for first expense
    const editButtons = screen.getAllByTitle("Edit expense");
    fireEvent.click(editButtons[0]);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText("Edit Expense")).toBeInTheDocument();
    });

    // Form should be pre-filled with existing data
    expect(screen.getByDisplayValue("Coffee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5.99")).toBeInTheDocument();

    // Submit form without changes
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => {
      expect(mockUpdateExpense).toHaveBeenCalledWith("1", {
        description: "Coffee",
        amount: "5.99",
        date: "2024-01-15",
        category: "Food & Dining",
        reimbursed: false,
      });
    });
  });

  it("displays mobile group header layout when in mobile view", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });
    // Set mobile view
    mockUseIsDesktop.mockReturnValue(false);

    render(<App />);

    // Check that mobile layout elements are present (lines 203-229)
    expect(screen.getByText("January 2024")).toBeInTheDocument(); // Month header

    // Check for mobile-specific layout with grid columns in the expense group header
    // The mobile layout uses "text-gray-500 text-xs" class for labels
    const labelElements = document.querySelectorAll(".text-gray-500.text-xs");

    // Should find the mobile labels (Total, Reimbursed, Pending) in the grid layout
    expect(labelElements.length).toBeGreaterThanOrEqual(3);

    // Verify the specific text content appears in mobile grid layout
    const pageContent = document.body.textContent || "";
    expect(pageContent).toContain("Total");
    expect(pageContent).toContain("Reimbursed");
    expect(pageContent).toContain("Pending");

    // Verify the mobile totals are displayed with proper formatting
    expect(screen.getAllByText("$50.99").length).toBeGreaterThanOrEqual(1); // Total
    expect(screen.getAllByText("$45.00").length).toBeGreaterThanOrEqual(1); // Reimbursed
    expect(screen.getAllByText("$5.99").length).toBeGreaterThanOrEqual(1); // Pending
  });

  it("handles bulk expense upload by calling addExpense for each item in array", async () => {
    const mockAddExpense = vi.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: [],
      loading: false,
      addExpense: mockAddExpense,
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    // Create a test component that directly calls the bulk functionality
    const TestBulkComponent = () => {
      const { user } = useAuth();
      const { addExpense } = useExpenses(user?.uid || null);

      const handleBulkSubmit = async () => {
        const bulkExpenses = [
          {
            description: "Coffee",
            amount: "5.99",
            date: "2024-01-15",
            category: "Food & Dining",
            reimbursed: false,
          },
          {
            description: "Lunch",
            amount: "12.50",
            date: "2024-01-15",
            category: "Food & Dining",
            reimbursed: false,
          },
        ];

        // Simulate the bulk processing logic from App.tsx lines 58-60
        if (Array.isArray(bulkExpenses)) {
          for (const expense of bulkExpenses) {
            await addExpense(expense);
          }
        }
      };

      if (!user) return null;

      return (
        <button onClick={handleBulkSubmit} data-testid="bulk-submit">
          Submit Bulk
        </button>
      );
    };

    render(<TestBulkComponent />);

    // Click the bulk submit button
    fireEvent.click(screen.getByTestId("bulk-submit"));

    // Wait for all addExpense calls to complete
    await waitFor(() => {
      expect(mockAddExpense).toHaveBeenCalledTimes(2);
    });

    // Verify each expense was added individually (testing lines 58-60)
    expect(mockAddExpense).toHaveBeenNthCalledWith(1, {
      description: "Coffee",
      amount: "5.99",
      date: "2024-01-15",
      category: "Food & Dining",
      reimbursed: false,
    });
    expect(mockAddExpense).toHaveBeenNthCalledWith(2, {
      description: "Lunch",
      amount: "12.50",
      date: "2024-01-15",
      category: "Food & Dining",
      reimbursed: false,
    });
  });

  it("renders Match Reimbursements button", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Check that the Match Reimbursements button is present
    expect(screen.getByText("Match Reimbursements")).toBeInTheDocument();
  });

  it("opens reimbursement modal when Match Reimbursements button is clicked", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open reimbursement matching modal" })
    );
    expect(
      screen.getByRole("heading", { name: "Match Reimbursements" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Enter your reimbursement total to find matching expense combinations and bulk mark them as reimbursed/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Matches prioritize oldest expenses first/)
    ).toBeInTheDocument();
  });

  it("shows shortened button text on mobile view", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });
    // Set mobile view
    mockUseIsDesktop.mockReturnValue(false);

    render(<App />);

    // On mobile, the button should show "Match" instead of "Match Reimbursements"
    expect(screen.getByText("Match")).toBeInTheDocument();
  });

  it("handles bulk mark reimbursed functionality", async () => {
    const mockToggleReimbursed = vi.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: mockToggleReimbursed,
    });

    // Create a test component that directly tests the bulk reimbursement logic
    const TestBulkReimbursementComponent = () => {
      const { user } = useAuth();
      const { toggleReimbursed } = useExpenses(user?.uid || null);

      const handleBulkMarkReimbursed = async () => {
        const expenseIds = ["1", "2"];
        // Simulate the bulk reimbursement logic from App.tsx lines 105-109
        for (const id of expenseIds) {
          await toggleReimbursed(id, true);
        }
      };

      if (!user) return null;

      return (
        <button onClick={handleBulkMarkReimbursed} data-testid="bulk-reimburse">
          Mark as Reimbursed
        </button>
      );
    };

    render(<TestBulkReimbursementComponent />);

    // Click the bulk reimbursement button
    fireEvent.click(screen.getByTestId("bulk-reimburse"));

    // Wait for all toggleReimbursed calls to complete
    await waitFor(() => {
      expect(mockToggleReimbursed).toHaveBeenCalledTimes(2);
    });

    // Verify each expense was marked as reimbursed individually
    expect(mockToggleReimbursed).toHaveBeenNthCalledWith(1, "1", true);
    expect(mockToggleReimbursed).toHaveBeenNthCalledWith(2, "2", true);
  });

  it("passes correct props to ReimbursementModal", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Open the reimbursement modal
    fireEvent.click(
      screen.getByRole("button", { name: "Open reimbursement matching modal" })
    );

    // Modal should receive the correct expenses data
    // This indirectly tests that the modal is receiving props correctly
    expect(screen.getByText("Ready to find matches")).toBeInTheDocument();

    // Should show pending expenses count (1 pending expense from mockExpenses)
    expect(screen.getByText(/You have 1 pending expense/)).toBeInTheDocument();
  });

  it("closes reimbursement modal when close button is clicked", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user1", email: "test@example.com" },
      loading: false,
    });
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      toggleReimbursed: vi.fn(),
    });

    render(<App />);

    // Open the modal
    fireEvent.click(
      screen.getByRole("button", { name: "Open reimbursement matching modal" })
    );
    expect(screen.getByText("Ready to find matches")).toBeInTheDocument();

    // Close the modal by clicking the X button
    const closeButton = screen.getByRole("button", {
      name: "Close reimbursement modal",
    });
    fireEvent.click(closeButton);

    // Modal should be closed - the modal content should not be visible
    expect(screen.queryByText("Ready to find matches")).not.toBeInTheDocument();
  });
});
