import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { useExpenses } from "./hooks/useExpenses";
import { Expense, ExpenseFormData } from "./types/expense";
import { formatCurrency, groupExpensesByMonth } from "./utils/expenseUtils";

import AuthScreen from "./components/AuthScreen";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import FilterBar from "./components/FilterBar";
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";

function App() {
  const { user, loading: authLoading } = useAuth();
  const {
    expenses,
    loading: expensesLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleReimbursed,
  } = useExpenses(user?.uid || null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<"all" | "reimbursed" | "pending">("all");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filter === "reimbursed") return expense.reimbursed;
      if (filter === "pending") return !expense.reimbursed;
      return true;
    });
  }, [expenses, filter]);

  const monthlyGroups = useMemo(() => {
    return groupExpensesByMonth(filteredExpenses);
  }, [filteredExpenses]);

  const totals = useMemo(() => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursed = expenses
      .filter((expense) => expense.reimbursed)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pending = total - reimbursed;

    return { total, reimbursed, pending };
  }, [expenses]);

  const handleAddExpense = async (
    data: ExpenseFormData | ExpenseFormData[]
  ) => {
    if (Array.isArray(data)) {
      // Bulk upload
      for (const expense of data) {
        await addExpense(expense);
      }
    } else {
      // Single expense
      await addExpense(data);
    }
    setIsFormOpen(false);
  };

  const handleEditExpense = async (
    data: ExpenseFormData | ExpenseFormData[]
  ) => {
    if (editingExpense && !Array.isArray(data)) {
      await updateExpense(editingExpense.id, data);
      setEditingExpense(null);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense(id);
    }
  };

  const handleDuplicate = (expense: Expense) => {
    setEditingExpense({
      ...expense,
      id: "", // Clear the ID so it creates a new expense
      reimbursed: false, // Reset reimbursed status
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Summary Cards */}
        <div className="mb-6 sm:mb-8">
          <SummaryCards
            total={totals.total}
            reimbursed={totals.reimbursed}
            pending={totals.pending}
          />
        </div>

        {/* Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <FilterBar filter={filter} onFilterChange={setFilter} />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>

        {/* Expenses List */}
        {expensesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              data-testid="loading-spinner"
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            ></div>
          </div>
        ) : monthlyGroups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            {expenses.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No expenses yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Get started by adding your first expense.
                </p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Add Your First Expense
                </button>
              </>
            ) : filter === "reimbursed" ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reimbursed expenses
                </h3>
                <p className="text-gray-500">
                  You haven't marked any expenses as reimbursed yet.
                </p>
              </>
            ) : filter === "pending" ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending expenses
                </h3>
                <p className="text-gray-500">
                  All your expenses have been reimbursed!
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No expenses found
                </h3>
                <p className="text-gray-500">
                  No expenses match the current filter.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {monthlyGroups.map((group) => (
              <div
                key={group.monthYear}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <h2 className="text-lg font-medium text-gray-900">
                      {group.monthYear}
                    </h2>
                    <div className="grid grid-cols-3 sm:flex sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-sm">
                      <div className="text-center sm:text-left">
                        <div className="text-gray-500 text-xs sm:hidden">
                          Total
                        </div>
                        <div className="font-bold sm:font-medium text-gray-900 text-sm sm:text-sm">
                          <span className="hidden sm:inline text-gray-600 font-normal">
                            Total:{" "}
                          </span>
                          {formatCurrency(group.total)}
                        </div>
                      </div>
                      <div className="text-center sm:text-left">
                        <div className="text-gray-500 text-xs sm:hidden">
                          Reimbursed
                        </div>
                        <div className="font-bold sm:font-medium text-green-600 text-sm sm:text-sm">
                          <span className="hidden sm:inline text-green-600 font-normal">
                            Reimbursed:{" "}
                          </span>
                          {formatCurrency(group.reimbursed)}
                        </div>
                      </div>
                      <div className="text-center sm:text-left">
                        <div className="text-gray-500 text-xs sm:hidden">
                          Pending
                        </div>
                        <div className="font-bold sm:font-medium text-amber-600 text-sm sm:text-sm">
                          <span className="hidden sm:inline text-amber-600 font-normal">
                            Pending:{" "}
                          </span>
                          {formatCurrency(group.pending)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <ExpenseList
                    expenses={group.expenses}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleReimbursed={toggleReimbursed}
                    onDuplicate={handleDuplicate}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ExpenseForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={
          editingExpense && editingExpense.id
            ? handleEditExpense
            : handleAddExpense
        }
        initialData={
          editingExpense
            ? {
                description: editingExpense.description,
                amount: editingExpense.amount.toString(),
                date: editingExpense.date,
                category: editingExpense.category,
                reimbursed: editingExpense.reimbursed,
              }
            : undefined
        }
        title={
          editingExpense && editingExpense.id
            ? "Edit Expense"
            : "Add New Expense"
        }
      />

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
