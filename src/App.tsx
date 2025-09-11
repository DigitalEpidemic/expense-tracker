import { Calculator, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { useExpenses } from "./hooks/useExpenses";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { Expense, ExpenseFormData } from "./types/expense";
import {
  calculateTotals,
  formatCurrency,
  groupExpensesByMonth,
} from "./utils/expenseUtils";

import AuthScreen from "./components/AuthScreen";
import EmptyState from "./components/EmptyState";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import FilterBar from "./components/FilterBar";
import Header from "./components/Header";
import LoadingSpinner from "./components/LoadingSpinner";
import ReimbursementModal from "./components/ReimbursementModal";
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
  const isDesktop = useIsDesktop();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<"all" | "reimbursed" | "pending">("all");
  const [isReimbursementModalOpen, setIsReimbursementModalOpen] =
    useState(false);

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

  const totals = useMemo(() => calculateTotals(expenses), [expenses]);

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

  const handleBulkMarkReimbursed = async (expenseIds: string[]) => {
    for (const id of expenseIds) {
      await toggleReimbursed(id, true);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
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
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsReimbursementModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
            >
              <Calculator className="w-5 h-5" />
              <span className="hidden sm:inline">Match Reimbursements</span>
              <span className="sm:hidden">Match</span>
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Expenses List */}
        {expensesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : monthlyGroups.length === 0 ? (
          <EmptyState
            expenses={expenses}
            filter={filter}
            onAddExpense={() => setIsFormOpen(true)}
          />
        ) : (
          <div className="space-y-8">
            {monthlyGroups.map((group) => (
              <div
                key={group.monthYear}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div
                  className={`bg-gray-50 border-b border-gray-200 ${
                    isDesktop ? "px-6 py-4" : "px-4 py-3"
                  }`}
                >
                  {isDesktop ? (
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        {group.monthYear}
                      </h2>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            <span className="text-gray-600 font-normal">
                              Total:{" "}
                            </span>
                            {formatCurrency(group.total)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-green-600">
                            <span className="text-green-600 font-normal">
                              Reimbursed:{" "}
                            </span>
                            {formatCurrency(group.reimbursed)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-amber-600">
                            <span className="text-amber-600 font-normal">
                              Pending:{" "}
                            </span>
                            {formatCurrency(group.pending)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-medium text-gray-900">
                        {group.monthYear}
                      </h2>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500 text-xs">Total</div>
                          <div className="font-bold text-gray-900">
                            {formatCurrency(group.total)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 text-xs">
                            Reimbursed
                          </div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(group.reimbursed)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 text-xs">Pending</div>
                          <div className="font-bold text-amber-600">
                            {formatCurrency(group.pending)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className={isDesktop ? "p-6" : "p-4"}>
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

      <ReimbursementModal
        isOpen={isReimbursementModalOpen}
        onClose={() => setIsReimbursementModalOpen(false)}
        expenses={expenses}
        onMarkReimbursed={handleBulkMarkReimbursed}
      />

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
