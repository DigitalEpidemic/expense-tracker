import { Expense, MonthlyGroup } from "../types/expense";

const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const groupExpensesByMonth = (expenses: Expense[]): MonthlyGroup[] => {
  const groups: { [key: string]: Expense[] } = {};

  expenses.forEach((expense) => {
    const date = parseLocalDate(expense.date);
    const monthYear = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(expense);
  });

  return Object.entries(groups).map(([monthYear, expenses]) => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursed = expenses
      .filter((expense) => expense.reimbursed)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pending = total - reimbursed;

    return {
      monthYear,
      expenses,
      total,
      reimbursed,
      pending,
    };
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const calculateTotals = (expenses: Expense[]) => {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const reimbursed = expenses
    .filter((expense) => expense.reimbursed)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pending = total - reimbursed;

  return { total, reimbursed, pending };
};

export const getExpenseCategories = (): string[] => {
  return [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Education",
    "Business",
    "Other",
  ];
};
