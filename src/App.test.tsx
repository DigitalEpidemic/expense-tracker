import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Mock, vi } from "vitest";
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
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    description: "Gas",
    amount: 45.0,
    date: "2024-01-10",
    category: "Transportation",
    reimbursed: true,
    userId: "user1",
    createdAt: "2024-01-10T08:00:00Z",
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
    fireEvent.click(screen.getByText("Save"));

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
    fireEvent.click(screen.getByText("Save"));

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
});
