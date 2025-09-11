import { describe, expect, it } from "vitest";
import { Expense } from "../types/expense";
import {
  formatCurrency,
  formatDate,
  getExpenseCategories,
  groupExpensesByMonth,
} from "./expenseUtils";

const mockExpenses: Expense[] = [
  {
    id: "1",
    description: "Lunch",
    amount: 25.5,
    date: "2024-01-15",
    category: "Food & Dining",
    reimbursed: false,
    userId: "user1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    description: "Gas",
    amount: 45.0,
    date: "2024-01-20",
    category: "Transportation",
    reimbursed: true,
    userId: "user1",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "3",
    description: "Coffee",
    amount: 5.75,
    date: "2024-02-01",
    category: "Food & Dining",
    reimbursed: false,
    userId: "user1",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "4",
    description: "Dinner",
    amount: 80.0,
    date: "2024-02-15",
    category: "Food & Dining",
    reimbursed: true,
    userId: "user1",
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15"),
  },
];

describe("expenseUtils", () => {
  describe("groupExpensesByMonth", () => {
    it("should group expenses by month and year", () => {
      const groups = groupExpensesByMonth(mockExpenses);

      expect(groups).toHaveLength(2);
      expect(groups[0].monthYear).toBe("January 2024");
      expect(groups[0].expenses).toHaveLength(2);
      expect(groups[1].monthYear).toBe("February 2024");
      expect(groups[1].expenses).toHaveLength(2);
    });

    it("should calculate correct totals for each month", () => {
      const groups = groupExpensesByMonth(mockExpenses);

      const januaryGroup = groups.find((g) => g.monthYear === "January 2024");
      expect(januaryGroup?.total).toBe(70.5); // 25.50 + 45.00
      expect(januaryGroup?.reimbursed).toBe(45.0); // Only gas is reimbursed
      expect(januaryGroup?.pending).toBe(25.5); // 70.50 - 45.00

      const februaryGroup = groups.find((g) => g.monthYear === "February 2024");
      expect(februaryGroup?.total).toBe(85.75); // 5.75 + 80.00
      expect(februaryGroup?.reimbursed).toBe(80.0); // Only dinner is reimbursed
      expect(februaryGroup?.pending).toBe(5.75); // 85.75 - 80.00
    });

    it("should handle empty expense array", () => {
      const groups = groupExpensesByMonth([]);
      expect(groups).toHaveLength(0);
    });

    it("should handle single expense", () => {
      const singleExpense = [mockExpenses[0]];
      const groups = groupExpensesByMonth(singleExpense);

      expect(groups).toHaveLength(1);
      expect(groups[0].total).toBe(25.5);
      expect(groups[0].reimbursed).toBe(0);
      expect(groups[0].pending).toBe(25.5);
    });
  });

  describe("formatCurrency", () => {
    it("should format positive amounts correctly", () => {
      expect(formatCurrency(25.5)).toBe("$25.50");
      expect(formatCurrency(1000)).toBe("$1,000.00");
      expect(formatCurrency(0.99)).toBe("$0.99");
    });

    it("should format zero correctly", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should format negative amounts correctly", () => {
      expect(formatCurrency(-25.5)).toBe("-$25.50");
    });

    it("should handle large amounts", () => {
      expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
    });
  });

  describe("formatDate", () => {
    it("should format dates correctly", () => {
      expect(formatDate("2024-01-15")).toBe("Mon, Jan 15, 2024");
      expect(formatDate("2024-12-31")).toBe("Tue, Dec 31, 2024");
      expect(formatDate("2024-07-04")).toBe("Thu, Jul 4, 2024");
    });

    it("should handle single digit days and months", () => {
      expect(formatDate("2024-01-05")).toBe("Fri, Jan 5, 2024");
      expect(formatDate("2024-09-01")).toBe("Sun, Sep 1, 2024");
    });
  });

  describe("getExpenseCategories", () => {
    it("should return all expense categories", () => {
      const categories = getExpenseCategories();

      expect(categories).toHaveLength(10);
      expect(categories).toContain("Food & Dining");
      expect(categories).toContain("Transportation");
      expect(categories).toContain("Shopping");
      expect(categories).toContain("Entertainment");
      expect(categories).toContain("Bills & Utilities");
      expect(categories).toContain("Healthcare");
      expect(categories).toContain("Travel");
      expect(categories).toContain("Education");
      expect(categories).toContain("Business");
      expect(categories).toContain("Other");
    });

    it("should return the same categories on multiple calls", () => {
      const categories1 = getExpenseCategories();
      const categories2 = getExpenseCategories();

      expect(categories1).toEqual(categories2);
    });
  });
});
