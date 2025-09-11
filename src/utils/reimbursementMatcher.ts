import { Expense } from "../types/expense";

export interface ReimbursementMatch {
  expenses: Expense[];
  total: number;
  exactMatch: boolean;
}

export const findReimbursementMatches = (
  pendingExpenses: Expense[],
  targetAmount: number,
  tolerance: number = 0.01
): ReimbursementMatch[] => {
  const matches: ReimbursementMatch[] = [];
  const expenses = pendingExpenses.filter((expense) => !expense.reimbursed);

  if (expenses.length === 0) {
    return matches;
  }

  const generateCombinations = (
    arr: Expense[],
    maxSize: number = Math.min(10, arr.length)
  ): Expense[][] => {
    const combinations: Expense[][] = [];

    const backtrack = (start: number, current: Expense[]) => {
      if (current.length > 0 && current.length <= maxSize) {
        combinations.push([...current]);
      }

      if (current.length >= maxSize) return;

      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    };

    backtrack(0, []);
    return combinations;
  };

  const combinations = generateCombinations(expenses);

  for (const combination of combinations) {
    const total = combination.reduce((sum, expense) => sum + expense.amount, 0);
    const difference = Math.abs(total - targetAmount);

    if (difference <= tolerance) {
      matches.push({
        expenses: combination,
        total,
        exactMatch: difference < 0.001,
      });
    }
  }

  return matches.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;

    const diffA = Math.abs(a.total - targetAmount);
    const diffB = Math.abs(b.total - targetAmount);
    return diffA - diffB;
  });
};

export const formatMatchSummary = (match: ReimbursementMatch): string => {
  const { expenses, total, exactMatch } = match;

  if (expenses.length === 1) {
    return `1 expense (${exactMatch ? "exact match" : "close match"})`;
  }

  return `${expenses.length} expenses (${
    exactMatch ? "exact match" : "close match"
  })`;
};
