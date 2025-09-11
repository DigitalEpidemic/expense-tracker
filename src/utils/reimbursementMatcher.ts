import { Expense } from "../types/expense";

// Configuration constants - adjust these to tune performance vs completeness
const MAX_TOTAL_MATCHES = 100; // Maximum number of matches to return
const MAX_COMBINATIONS_PER_AMOUNT = 20; // Maximum combinations to generate per amount group
const MAX_COMBINATION_SIZE = 10; // Maximum number of expenses in a single match

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
  const expenses = pendingExpenses
    .filter((expense) => !expense.reimbursed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (expenses.length === 0) {
    return matches;
  }

  // Group expenses by amount to avoid duplicate work
  const expenseGroups = new Map<number, Expense[]>();
  for (const expense of expenses) {
    const amount = Math.round(expense.amount * 100) / 100; // Round to 2 decimal places
    if (!expenseGroups.has(amount)) {
      expenseGroups.set(amount, []);
    }
    expenseGroups.get(amount)!.push(expense);
  }

  const uniqueAmounts = Array.from(expenseGroups.keys()).sort((a, b) => a - b);
  const maxCombinationSize = Math.min(MAX_COMBINATION_SIZE, expenses.length);

  // Use dynamic programming approach to find combinations
  const findCombinations = (
    amounts: number[],
    target: number,
    tolerance: number,
    maxSize: number
  ): number[][] => {
    const results: number[][] = [];

    const backtrack = (
      index: number,
      currentCombination: number[],
      currentSum: number,
      remainingSize: number
    ) => {
      // Early termination if we have enough matches
      if (results.length >= MAX_TOTAL_MATCHES) return;

      // Check if current combination is within tolerance
      const difference = Math.abs(currentSum - target);
      if (difference <= tolerance && currentCombination.length > 0) {
        results.push([...currentCombination]);
      }

      // Early termination conditions
      if (
        remainingSize <= 0 ||
        index >= amounts.length ||
        currentSum > target + tolerance
      ) {
        return;
      }

      // Try including current amount (with different quantities if multiple expenses exist)
      const amount = amounts[index];
      const availableCount = expenseGroups.get(amount)!.length;

      for (
        let count = 1;
        count <= Math.min(availableCount, remainingSize);
        count++
      ) {
        const newSum = currentSum + amount * count;
        if (newSum <= target + tolerance) {
          // Add 'count' instances of this amount
          for (let i = 0; i < count; i++) {
            currentCombination.push(amount);
          }

          backtrack(
            index + 1,
            currentCombination,
            newSum,
            remainingSize - count
          );

          // Remove the added amounts
          for (let i = 0; i < count; i++) {
            currentCombination.pop();
          }
        } else {
          break; // No point trying larger counts
        }
      }

      // Try skipping current amount
      backtrack(index + 1, currentCombination, currentSum, remainingSize);
    };

    backtrack(0, [], 0, maxSize);
    return results;
  };

  const amountCombinations = findCombinations(
    uniqueAmounts,
    targetAmount,
    tolerance,
    maxCombinationSize
  );

  // Convert amount combinations to actual expense combinations
  // Generate limited expense combinations for each amount pattern
  const generateExpenseCombinations = (
    amountCombo: number[],
    maxCombos: number = MAX_COMBINATIONS_PER_AMOUNT
  ): Expense[][] => {
    // Count occurrences of each amount
    const amountCounts = new Map<number, number>();
    for (const amount of amountCombo) {
      amountCounts.set(amount, (amountCounts.get(amount) || 0) + 1);
    }

    // Generate limited combinations by selecting different expenses for each amount
    const combinations: Expense[][] = [];

    const generateCombos = (
      amounts: [number, number][],
      currentCombo: Expense[]
    ): void => {
      if (combinations.length >= maxCombos) return; // Early termination

      if (amounts.length === 0) {
        combinations.push([...currentCombo]);
        return;
      }

      const [amount, count] = amounts[0];
      const remainingAmounts = amounts.slice(1);
      const availableExpenses = expenseGroups.get(amount)!;

      // Limit combinations for this amount to prevent explosion
      const maxCombosForAmount = Math.min(
        MAX_COMBINATIONS_PER_AMOUNT,
        availableExpenses.length
      );
      let combosGenerated = 0;

      // Generate combinations of `count` expenses from available expenses of this amount
      const generateAmountCombos = (
        startIndex: number,
        selectedCount: number,
        currentSelection: Expense[]
      ): void => {
        if (
          combinations.length >= maxCombos ||
          combosGenerated >= maxCombosForAmount
        )
          return;

        if (selectedCount === count) {
          generateCombos(remainingAmounts, [
            ...currentCombo,
            ...currentSelection,
          ]);
          combosGenerated++;
          return;
        }

        for (
          let i = startIndex;
          i < availableExpenses.length && combinations.length < maxCombos;
          i++
        ) {
          currentSelection.push(availableExpenses[i]);
          generateAmountCombos(i + 1, selectedCount + 1, currentSelection);
          currentSelection.pop();
        }
      };

      if (availableExpenses.length >= count) {
        generateAmountCombos(0, 0, []);
      }
    };

    generateCombos(Array.from(amountCounts.entries()), []);
    return combinations;
  };

  for (const amountCombo of amountCombinations) {
    if (matches.length >= MAX_TOTAL_MATCHES) break; // Early termination

    const expenseCombinations = generateExpenseCombinations(amountCombo);

    for (const expenseCombination of expenseCombinations) {
      if (matches.length >= MAX_TOTAL_MATCHES) break; // Early termination

      const total = expenseCombination.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const difference = Math.abs(total - targetAmount);

      matches.push({
        expenses: expenseCombination,
        total,
        exactMatch: difference < 0.001,
      });
    }
  }

  // Remove exact duplicates only (same set of expense IDs)
  const uniqueMatches = matches.filter((match, index, array) => {
    const matchIds = new Set(match.expenses.map((e) => e.id));
    return !array.slice(0, index).some((prevMatch) => {
      const prevIds = new Set(prevMatch.expenses.map((e) => e.id));
      return (
        matchIds.size === prevIds.size &&
        Array.from(matchIds).every((id) => prevIds.has(id))
      );
    });
  });

  return uniqueMatches.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;

    const diffA = Math.abs(a.total - targetAmount);
    const diffB = Math.abs(b.total - targetAmount);
    return diffA - diffB;
  });
};

export const formatMatchSummary = (match: ReimbursementMatch): string => {
  const { expenses, exactMatch } = match;

  if (expenses.length === 1) {
    return `1 expense (${exactMatch ? "exact match" : "close match"})`;
  }

  return `${expenses.length} expenses (${
    exactMatch ? "exact match" : "close match"
  })`;
};
