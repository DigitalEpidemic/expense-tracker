import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Expense } from "../types/expense";
import EmptyState from "./EmptyState";

const mockExpenses: Expense[] = [
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

describe("EmptyState", () => {
  const mockOnAddExpense = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no expenses message when there are no expenses", () => {
    render(
      <EmptyState expenses={[]} filter="all" onAddExpense={mockOnAddExpense} />
    );

    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by adding your first expense.")
    ).toBeInTheDocument();
    expect(screen.getByText("Add Your First Expense")).toBeInTheDocument();
  });

  it("shows reimbursed filter message when filter is reimbursed and has expenses", () => {
    render(
      <EmptyState
        expenses={mockExpenses}
        filter="reimbursed"
        onAddExpense={mockOnAddExpense}
      />
    );

    expect(screen.getByText("No reimbursed expenses")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't marked any expenses as reimbursed yet.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows pending filter message when filter is pending and has expenses", () => {
    render(
      <EmptyState
        expenses={mockExpenses}
        filter="pending"
        onAddExpense={mockOnAddExpense}
      />
    );

    expect(screen.getByText("No pending expenses")).toBeInTheDocument();
    expect(
      screen.getByText("All your expenses have been reimbursed!")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows default filter message when filter is all and has expenses", () => {
    render(
      <EmptyState
        expenses={mockExpenses}
        filter="all"
        onAddExpense={mockOnAddExpense}
      />
    );

    expect(screen.getByText("No expenses found")).toBeInTheDocument();
    expect(
      screen.getByText("No expenses match the current filter.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onAddExpense when button is clicked", () => {
    render(
      <EmptyState expenses={[]} filter="all" onAddExpense={mockOnAddExpense} />
    );

    const button = screen.getByText("Add Your First Expense");
    button.click();

    expect(mockOnAddExpense).toHaveBeenCalledTimes(1);
  });
});
