import { act, renderHook, waitFor } from "@testing-library/react";
import * as firestore from "firebase/firestore";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useExpenses } from "./useExpenses";

// Mock Firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}));

vi.mock("../config/firebase", () => ({
  db: {},
}));

vi.mock("react-hot-toast");
vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

const mockExpensesData = [
  {
    id: "1",
    description: "Lunch",
    amount: 25.5,
    date: "2024-01-15",
    category: "Food & Dining",
    reimbursed: false,
    userId: "user1",
    createdAt: { toDate: () => new Date("2024-01-15") },
    updatedAt: { toDate: () => new Date("2024-01-15") },
  },
  {
    id: "2",
    description: "Gas",
    amount: 45.0,
    date: "2024-01-20",
    category: "Transportation",
    reimbursed: true,
    userId: "user1",
    createdAt: { toDate: () => new Date("2024-01-20") },
    updatedAt: { toDate: () => new Date("2024-01-20") },
  },
];

describe("useExpenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(firestore.collection).mockReturnValue(
      "collection" as unknown as firestore.CollectionReference
    );
    vi.mocked(firestore.where).mockReturnValue({
      type: "where",
    } as unknown as firestore.QueryFieldFilterConstraint);
    vi.mocked(firestore.orderBy).mockReturnValue({
      type: "orderBy",
    } as unknown as firestore.QueryOrderByConstraint);
    vi.mocked(firestore.query).mockReturnValue(
      "query" as unknown as firestore.Query
    );
    vi.mocked(firestore.doc).mockReturnValue(
      "docRef" as unknown as firestore.DocumentReference
    );
  });

  it("should initialize with empty expenses and loading state", () => {
    vi.mocked(firestore.onSnapshot).mockImplementation(() => {
      return vi.fn(); // unsubscribe function
    });

    const { result } = renderHook(() => useExpenses("user1"));

    expect(result.current.expenses).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(typeof result.current.addExpense).toBe("function");
    expect(typeof result.current.updateExpense).toBe("function");
    expect(typeof result.current.deleteExpense).toBe("function");
    expect(typeof result.current.toggleReimbursed).toBe("function");
  });

  it("should handle null userId", () => {
    const { result } = renderHook(() => useExpenses(null));

    expect(result.current.expenses).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(firestore.onSnapshot).not.toHaveBeenCalled();
  });

  it("should fetch expenses when userId is provided", async () => {
    const mockSnapshot = {
      forEach: vi.fn(
        (callback: (doc: { id: string; data: () => unknown }) => void) => {
          mockExpensesData.forEach((expense) => {
            callback({
              id: expense.id,
              data: () => expense,
            });
          });
        }
      ),
    };

    (vi.mocked(firestore.onSnapshot) as unknown as Mock).mockImplementation(
      (_query: unknown, callback: (snapshot: unknown) => void) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return vi.fn(); // unsubscribe function
      }
    );

    const { result } = renderHook(() => useExpenses("user1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.expenses).toHaveLength(2);
      expect(result.current.expenses[0].description).toBe("Lunch");
      expect(result.current.expenses[1].description).toBe("Gas");
    });
  });

  it("should add expense successfully", async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue(
      {} as unknown as firestore.DocumentReference
    );

    const { result } = renderHook(() => useExpenses("user1"));

    const expenseData = {
      description: "Coffee",
      amount: "5.50",
      date: "2024-01-25",
      category: "Food & Dining",
      reimbursed: false,
    };

    await act(async () => {
      await result.current.addExpense(expenseData);
    });

    expect(firestore.addDoc).toHaveBeenCalledWith("collection", {
      ...expenseData,
      amount: 5.5,
      userId: "user1",
      createdAt: expect.any(Object),
      updatedAt: expect.any(Object),
    });
    expect(toast.success).toHaveBeenCalledWith("Expense added successfully!");
  });

  it("should handle add expense error", async () => {
    const error = new Error("Add failed");
    vi.mocked(firestore.addDoc).mockRejectedValue(error);

    const { result } = renderHook(() => useExpenses("user1"));

    const expenseData = {
      description: "Coffee",
      amount: "5.50",
      date: "2024-01-25",
      category: "Food & Dining",
      reimbursed: false,
    };

    await act(async () => {
      await result.current.addExpense(expenseData);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to add expense");
  });

  it("should not add expense when userId is null", async () => {
    const { result } = renderHook(() => useExpenses(null));

    const expenseData = {
      description: "Coffee",
      amount: "5.50",
      date: "2024-01-25",
      category: "Food & Dining",
      reimbursed: false,
    };

    await act(async () => {
      await result.current.addExpense(expenseData);
    });

    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it("should update expense successfully", async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue();

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.updateExpense("1", { description: "Updated lunch" });
    });

    expect(firestore.updateDoc).toHaveBeenCalledWith("docRef", {
      description: "Updated lunch",
      updatedAt: expect.any(Object),
    });
    expect(toast.success).toHaveBeenCalledWith("Expense updated successfully!");
  });

  it("should update expense with amount conversion", async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue();

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.updateExpense("1", { amount: "30.00" });
    });

    expect(firestore.updateDoc).toHaveBeenCalledWith("docRef", {
      amount: 30.0,
      updatedAt: expect.any(Object),
    });
  });

  it("should handle update expense error", async () => {
    const error = new Error("Update failed");
    vi.mocked(firestore.updateDoc).mockRejectedValue(error);

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.updateExpense("1", { description: "Updated lunch" });
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update expense");
  });

  it("should delete expense successfully", async () => {
    vi.mocked(firestore.deleteDoc).mockResolvedValue();

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.deleteExpense("1");
    });

    expect(firestore.deleteDoc).toHaveBeenCalledWith("docRef");
    expect(toast.success).toHaveBeenCalledWith("Expense deleted successfully!");
  });

  it("should handle delete expense error", async () => {
    const error = new Error("Delete failed");
    vi.mocked(firestore.deleteDoc).mockRejectedValue(error);

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.deleteExpense("1");
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to delete expense");
  });

  it("should toggle reimbursed status", async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue();

    const { result } = renderHook(() => useExpenses("user1"));

    await act(async () => {
      await result.current.toggleReimbursed("1", true);
    });

    expect(firestore.updateDoc).toHaveBeenCalledWith("docRef", {
      reimbursed: true,
      updatedAt: expect.any(Object),
    });
  });

  it("should clean up subscription on unmount", () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(firestore.onSnapshot).mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useExpenses("user1"));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("should clean up and recreate subscription when userId changes", () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(firestore.onSnapshot).mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(({ userId }) => useExpenses(userId), {
      initialProps: { userId: "user1" },
    });

    rerender({ userId: "user2" });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(firestore.onSnapshot).toHaveBeenCalledTimes(2);
  });

  it("should handle missing or invalid createdAt and updatedAt timestamps", async () => {
    const mockUnsubscribe = vi.fn();

    // Mock expense data with missing/invalid timestamps to test fallback (lines 42-43)
    const expenseWithMissingTimestamps = [
      {
        id: "1",
        description: "Test Expense",
        amount: 10.0,
        date: "2024-01-15",
        category: "Food & Dining",
        reimbursed: false,
        userId: "user1",
        // createdAt and updatedAt are missing/null to trigger fallback
        createdAt: null,
        updatedAt: undefined,
      },
      {
        id: "2",
        description: "Another Expense",
        amount: 15.0,
        date: "2024-01-16",
        category: "Transportation",
        reimbursed: true,
        userId: "user1",
        // createdAt with toDate that returns null and updatedAt with toDate that returns null
        createdAt: { toDate: () => null }, // Will fallback to new Date()
        updatedAt: { toDate: () => null }, // Will fallback to new Date()
      },
    ];

    const mockSnapshot = {
      forEach: vi.fn((callback) => {
        expenseWithMissingTimestamps.forEach((expense) => {
          callback({
            id: expense.id,
            data: () => expense,
          });
        });
      }),
    };

    (vi.mocked(firestore.onSnapshot) as unknown as Mock).mockImplementation(
      (_query: unknown, callback: (snapshot: unknown) => void) => {
        callback(mockSnapshot);
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useExpenses("user1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have processed both expenses with fallback timestamps
    expect(result.current.expenses).toHaveLength(2);

    // First expense should use fallback Date() for both timestamps (lines 42-43)
    const expense1 = result.current.expenses[0];
    expect(expense1.createdAt).toBeInstanceOf(Date);
    expect(expense1.updatedAt).toBeInstanceOf(Date);

    // Second expense should use fallback for both timestamps (lines 42-43)
    const expense2 = result.current.expenses[1];
    expect(expense2.createdAt).toBeInstanceOf(Date);
    expect(expense2.updatedAt).toBeInstanceOf(Date);
  });
});
