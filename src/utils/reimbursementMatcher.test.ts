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

    it("should handle many expenses with same amount efficiently", () => {
      // Create many expenses with same amount - this was the crash scenario
      const expenses = Array.from({ length: 50 }, (_, i) =>
        createMockExpense(i.toString(), 25.0, `Expense ${i}`)
      );

      const startTime = Date.now();
      const matches = findReimbursementMatches(expenses, 100.0); // 4 * 25.0
      const endTime = Date.now();

      // Should complete quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should find matches without duplicating the same expense
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);

      // Verify no match uses the same expense twice
      matches.forEach((match) => {
        const expenseIds = match.expenses.map((e) => e.id);
        const uniqueIds = new Set(expenseIds);
        expect(uniqueIds.size).toBe(expenseIds.length);
      });
    });

    it("should limit total number of matches to prevent UI slowdown", () => {
      // Create scenario that could generate many matches
      const expenses = Array.from({ length: 20 }, (_, i) =>
        createMockExpense(i.toString(), 5 + i, `Expense ${i}`)
      );

      const matches = findReimbursementMatches(expenses, 50.0);

      // Should not return excessive number of matches
      expect(matches.length).toBeLessThanOrEqual(100);
    });

    it("should return multiple valid combinations for same amounts", () => {
      // Create 4 expenses of $10 each - should find multiple ways to make $20
      const expenses = [
        createMockExpense("1", 10.0, "Coffee A", false, "2025-01-01"),
        createMockExpense("2", 10.0, "Coffee B", false, "2025-01-02"),
        createMockExpense("3", 10.0, "Coffee C", false, "2025-01-03"),
        createMockExpense("4", 10.0, "Coffee D", false, "2025-01-04"),
      ];

      const matches = findReimbursementMatches(expenses, 20.0);

      // Should find multiple combinations (limited by performance constraints)
      expect(matches.length).toBeGreaterThan(1);
      expect(matches.length).toBeLessThanOrEqual(10); // Respects the limit

      // All should be exact matches
      matches.forEach((match) => {
        expect(match.exactMatch).toBe(true);
        expect(match.expenses.length).toBe(2);
        expect(match.total).toBe(20.0);
      });

      // Verify all combinations are unique (no duplicate expense IDs in any match)
      const combinations = matches.map((match) =>
        match.expenses
          .map((e) => e.id)
          .sort()
          .join(",")
      );
      const uniqueCombinations = new Set(combinations);
      expect(uniqueCombinations.size).toBe(combinations.length);
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

    it("should handle mixed amounts with duplicates efficiently", () => {
      const expenses = [
        createMockExpense("1", 5.0, "Coffee A", false, "2025-01-01"),
        createMockExpense("2", 5.0, "Coffee B", false, "2025-01-02"),
        createMockExpense("3", 10.0, "Lunch A", false, "2025-01-03"),
        createMockExpense("4", 10.0, "Lunch B", false, "2025-01-04"),
        createMockExpense("5", 15.0, "Dinner", false, "2025-01-05"),
      ];

      const matches = findReimbursementMatches(expenses, 20.0);

      expect(matches.length).toBeGreaterThan(1);

      // Should find various combinations: 5+15, 10+10, etc.
      const totals = matches.map((match) => match.total);
      expect(totals.every((total) => total === 20.0)).toBe(true);

      // Should have different combination sizes
      const sizes = matches.map((match) => match.expenses.length);
      expect(new Set(sizes).size).toBeGreaterThan(1);
    });

    it("should handle tolerance correctly with close matches", () => {
      const expenses = [
        createMockExpense("1", 24.99, "Almost 25", false, "2025-01-01"),
        createMockExpense("2", 25.01, "Just over 25", false, "2025-01-02"),
        createMockExpense("3", 12.5, "Half", false, "2025-01-03"),
        createMockExpense("4", 12.49, "Almost half", false, "2025-01-04"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0, 0.02);

      // Should find close matches within tolerance
      expect(matches.length).toBeGreaterThan(0);

      const closeMatches = matches.filter((match) => !match.exactMatch);
      expect(closeMatches.length).toBeGreaterThan(0);

      // All matches should be within tolerance
      matches.forEach((match) => {
        const difference = Math.abs(match.total - 25.0);
        expect(difference).toBeLessThanOrEqual(0.02);
      });
    });

    it("should respect maximum combination size", () => {
      // Create many small expenses that could combine into large groups
      const expenses = Array.from({ length: 15 }, (_, i) =>
        createMockExpense(i.toString(), 1.0, `Dollar ${i}`)
      );

      const matches = findReimbursementMatches(expenses, 12.0);

      // Should not create combinations larger than MAX_COMBINATION_SIZE (10)
      matches.forEach((match) => {
        expect(match.expenses.length).toBeLessThanOrEqual(10);
      });
    });

    it("should handle zero amount gracefully", () => {
      const expenses = [
        createMockExpense("1", 10.0, "Valid expense"),
        createMockExpense("2", 0.0, "Zero expense"), // Edge case
      ];

      const matches = findReimbursementMatches(expenses, 10.0);

      // Should find at least one match with the 10.0 expense
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const validMatch = matches.find((match) =>
        match.expenses.some((e) => e.amount === 10.0)
      );
      expect(validMatch).toBeDefined();
    });

    it("should handle negative amounts gracefully", () => {
      const expenses = [
        createMockExpense("1", 10.0, "Valid expense"),
        createMockExpense("2", -5.0, "Refund"), // Edge case
      ];

      const matches = findReimbursementMatches(expenses, 10.0);

      // Should still find the positive amount match
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const positiveMatch = matches.find(
        (match) =>
          match.expenses.length === 1 && match.expenses[0].amount === 10.0
      );
      expect(positiveMatch).toBeDefined();
    });

    it("should handle very small tolerance", () => {
      const expenses = [
        createMockExpense("1", 25.1, "Too far", false, "2025-01-01"),
        createMockExpense("2", 24.9, "Also too far", false, "2025-01-02"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0, 0.05);

      // Should not find matches with such tight tolerance
      expect(matches.length).toBe(0);
    });

    it("should handle very large tolerance", () => {
      const expenses = [
        createMockExpense("1", 20.0, "Low", false, "2025-01-01"),
        createMockExpense("2", 30.0, "High", false, "2025-01-02"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0, 10.0);

      // Should find both matches with large tolerance
      expect(matches.length).toBe(2);
      matches.forEach((match) => {
        expect(match.exactMatch).toBe(false); // Neither is exact
      });
    });

    it("should prioritize exact matches over close matches in sorting", () => {
      const expenses = [
        createMockExpense("1", 24.99, "Close match", false, "2025-01-01"),
        createMockExpense("2", 25.0, "Exact match", false, "2025-01-02"),
        createMockExpense("3", 25.01, "Also close", false, "2025-01-03"),
      ];

      const matches = findReimbursementMatches(expenses, 25.0, 0.02);

      expect(matches.length).toBe(3);

      // First match should be the exact one
      expect(matches[0].exactMatch).toBe(true);
      expect(matches[0].expenses[0].amount).toBe(25.0);

      // Remaining should be close matches, sorted by difference
      expect(matches[1].exactMatch).toBe(false);
      expect(matches[2].exactMatch).toBe(false);
    });

    it("should handle performance with many unique amounts", () => {
      // Create many expenses with unique amounts
      const expenses = Array.from({ length: 30 }, (_, i) =>
        createMockExpense(i.toString(), 1.5 + i * 0.7, `Unique ${i}`)
      );

      const startTime = Date.now();
      const matches = findReimbursementMatches(expenses, 50.0);
      const endTime = Date.now();

      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(2000);
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should respect configuration limits", () => {
      // Create scenario that would generate many matches
      const expenses = Array.from({ length: 20 }, (_, i) =>
        createMockExpense(i.toString(), 2.5, `Same amount ${i}`)
      );

      const matches = findReimbursementMatches(expenses, 10.0); // 4 * 2.5

      // Should respect MAX_TOTAL_MATCHES limit (100)
      expect(matches.length).toBeLessThanOrEqual(100);
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
