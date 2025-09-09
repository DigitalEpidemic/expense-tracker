import { Expense, MonthlyGroup } from '../types/expense';

export const groupExpensesByMonth = (expenses: Expense[]): MonthlyGroup[] => {
  const groups: { [key: string]: Expense[] } = {};

  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const monthYear = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getExpenseCategories = (): string[] => {
  return [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Education',
    'Business',
    'Other',
  ];
};