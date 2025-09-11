import { describe, expect, it } from "vitest";
import { Expense } from "../types/expense";
import {
  findReimbursementMatches,
  formatMatchSummary,
} from "./reimbursementMatcher";

const createMockExpense = (
  id: string,
  amount: number,
  description: string,
  reimbursed = false,
  date = "2025-01-15"
): Expense => ({
  id,
  description,
  amount,
  date,
  category: "Food & Dining",
  reimbursed,
  userId: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("reimbursementMatcher", () => {
  describe("findReimbursementMatches", () => {
    it("should find exact single expense match", () => {
      const expenses = [
        createMockExpense("1", 25.5, "Lunch"),
        createMockExpense("2", 15.75, "Coffee"),
        createMockExpense("3", 50.0, "Dinner"),
      ];

      const matches = findReimbursementMatches(expenses, 25.5);

      expect(matches).toHaveLength(1);
      expect(matches[0].exactMatch).toBe(true);
      expect(matches[0].expenses).toHaveLength(1);
      expect(matches[0].expenses[0].description).toBe("Lunch");
      expect(matches[0].total).toBe(25.5);
    });

    it("should find exact multiple expense match", () => {
      const expenses = [
        createMockExpense("1", 25.5, "Lunch"),
        createMockExpense("2", 15.75, "Coffee"),
        createMockExpense("3", 50.0, "Dinner"),
      ];

      const matches = findReimbursementMatches(expenses, 41.25); // 25.50 + 15.75

      expect(matches.length).toBeGreaterThan(0);
      const exactMatch = matches.find((match) => match.exactMatch);
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.expenses).toHaveLength(2);
      expect(exactMatch?.total).toBe(41.25);
    });

    it("should find close matches within tolerance", () => {
      const expenses = [
        createMockExpense("1", 25.49, "Lunch"),
        createMockExpense("2", 15.75, "Coffee"),
      ];

      const matches = findReimbursementMatches(expenses, 25.5, 0.02);

      expect(matches.length).toBeGreaterThan(0);
      const closeMatch = matches.find(
        (match) =>
          match.expenses.length === 1 &&
          match.expenses[0].description === "Lunch"
      );
      expect(closeMatch).toBeDefined();
      expect(closeMatch?.exactMatch).toBe(false);
    });

    it("should ignore already reimbursed expenses", () => {
      const expenses = [
        createMockExpense("1", 25.5, "Lunch", true), // already reimbursed
        createMockExpense("2", 25.5, "Coffee", false),
      ];

      const matches = findReimbursementMatches(expenses, 25.5);

      expect(matches).toHaveLength(1);
      expect(matches[0].expenses[0].description).toBe("Coffee");
    });

    it("should return empty array when no matches found", () => {
      const expenses = [
        createMockExpense("1", 10.0, "Snack"),
        createMockExpense("2", 20.0, "Lunch"),
      ];

      const matches = findReimbursementMatches(expenses, 100.0);

      expect(matches).toHaveLength(0);
    });

    it("should sort matches with exact matches first", () => {
      const expenses = [
        createMockExpense("1", 25.0, "Lunch"),
        createMockExpense("2", 25.01, "Coffee"), // close match
        createMockExpense("3", 10.0, "Snack"),
        createMockExpense("4", 15.0, "Drink"), // exact match when combined with snack
      ];

      const matches = findReimbursementMatches(expenses, 25.0, 0.02);

      expect(matches.length).toBeGreaterThan(0);
      // First match should be exact
      expect(matches[0].exactMatch).toBe(true);
    });

    it("should handle empty expense list", () => {
      const matches = findReimbursementMatches([], 25.0);
      expect(matches).toHaveLength(0);
    });

    it("should limit combinations to reasonable size", () => {
      // Create many expenses to test performance
      const expenses = Array.from({ length: 15 }, (_, i) =>
        createMockExpense(i.toString(), 10 + i, `Expense ${i}`)
      );

      const matches = findReimbursementMatches(expenses, 100.0);

      // Should complete without timeout and return results
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should prioritize oldest expenses first in matches", () => {
      const expenses = [
        createMockExpense("1", 25.0, "Recent Lunch", false, "2025-01-20"),
        createMockExpense("2", 25.0, "Old Lunch", false, "2025-01-10"),
        createMockExpense("3", 25.0, "Very Old Lunch", false, "2025-01-05"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0);

      expect(matches.length).toBeGreaterThan(0);
      // Should match the oldest expense first
      expect(matches[0].expenses[0].description).toBe("Very Old Lunch");
      expect(matches[0].expenses[0].date).toBe("2025-01-05");
    });

    it("should prioritize oldest expenses in multi-expense matches", () => {
      const expenses = [
        createMockExpense("1", 15.0, "Recent Coffee", false, "2025-01-20"),
        createMockExpense("2", 10.0, "Old Snack", false, "2025-01-10"),
        createMockExpense("3", 15.0, "Very Old Coffee", false, "2025-01-05"),
        createMockExpense("4", 10.0, "Recent Snack", false, "2025-01-18"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0); // Looking for 25.0 (15 + 10)

      expect(matches.length).toBeGreaterThan(0);
      const exactMatch = matches.find((match) => match.exactMatch);
      expect(exactMatch).toBeDefined();

      // Should prioritize the combination with oldest expenses
      const matchedDates = exactMatch!.expenses.map((e) => e.date).sort();
      expect(matchedDates).toContain("2025-01-05"); // Should include the very old coffee
      expect(matchedDates).toContain("2025-01-10"); // Should include the old snack
    });
  });

  describe("formatMatchSummary", () => {
    it("should format single expense summary", () => {
      const match = {
        expenses: [createMockExpense("1", 25.5, "Lunch")],
        total: 25.5,
        exactMatch: true,
      };

      const summary = formatMatchSummary(match);
      expect(summary).toBe("1 expense (exact match)");
    });

    it("should format multiple expense summary", () => {
      const match = {
        expenses: [
          createMockExpense("1", 25.5, "Lunch"),
          createMockExpense("2", 15.75, "Coffee"),
        ],
        total: 41.25,
        exactMatch: false,
      };

      const summary = formatMatchSummary(match);
      expect(summary).toBe("2 expenses (close match)");
    });
  });
});
