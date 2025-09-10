import { Plus } from "lucide-react";
import React from "react";
import { Expense } from "../types/expense";

interface EmptyStateProps {
  expenses: Expense[];
  filter: "all" | "reimbursed" | "pending";
  onAddExpense: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  expenses,
  filter,
  onAddExpense,
}) => {
  const getEmptyStateContent = () => {
    if (expenses.length === 0) {
      return {
        title: "No expenses yet",
        description: "Get started by adding your first expense.",
        showButton: true,
        buttonText: "Add Your First Expense",
      };
    }

    if (filter === "reimbursed") {
      return {
        title: "No reimbursed expenses",
        description: "You haven't marked any expenses as reimbursed yet.",
        showButton: false,
      };
    }

    if (filter === "pending") {
      return {
        title: "No pending expenses",
        description: "All your expenses have been reimbursed!",
        showButton: false,
      };
    }

    return {
      title: "No expenses found",
      description: "No expenses match the current filter.",
      showButton: false,
    };
  };

  const content = getEmptyStateContent();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Plus className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-500 mb-6">{content.description}</p>
      {content.showButton && (
        <button
          onClick={onAddExpense}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
        >
          {content.buttonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
