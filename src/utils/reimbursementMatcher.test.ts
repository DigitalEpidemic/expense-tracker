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
