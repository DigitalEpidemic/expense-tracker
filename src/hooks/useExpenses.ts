import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { db } from "../config/firebase";
import { Expense, ExpenseFormData } from "../types/expense";

export const useExpenses = (userId: string | null) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", userId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Expense);
      });
      setExpenses(expensesData);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const addExpense = async (expenseData: ExpenseFormData, silent = false) => {
    if (!userId) return;

    try {
      const now = new Date();
      await addDoc(collection(db, "expenses"), {
        ...expenseData,
        amount: parseFloat(expenseData.amount),
        userId,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      if (!silent) {
        toast.success("Expense added successfully!");
      }
    } catch (error: unknown) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    }
  };

  const updateExpense = async (
    id: string,
    expenseData: Partial<ExpenseFormData>,
    silent = false
  ) => {
    try {
      const docRef = doc(db, "expenses", id);
      const updateData: Record<string, unknown> = {
        ...expenseData,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (expenseData.amount) {
        updateData.amount = parseFloat(expenseData.amount);
      }

      // @ts-expect-error - Firestore typing issue with mixed string/number fields
      await updateDoc(docRef, updateData);
      if (!silent) {
        toast.success("Expense updated successfully!");
      }
    } catch (error: unknown) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast.success("Expense deleted successfully!");
    } catch (error: unknown) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const toggleReimbursed = async (
    id: string,
    reimbursed: boolean,
    silent = false
  ) => {
    await updateExpense(id, { reimbursed }, silent);
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleReimbursed,
  };
};
