import { Check, Copy, Edit2, Trash2, X } from "lucide-react";
import React from "react";
import { Expense } from "../types/expense";
import { formatCurrency, formatDate } from "../utils/expenseUtils";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onToggleReimbursed: (id: string, reimbursed: boolean) => void;
  onDuplicate: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEdit,
  onDelete,
  onToggleReimbursed,
  onDuplicate,
}) => {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No expenses found for this month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="w-24 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="w-28 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reimbursed
                </th>
                <th className="w-32 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {expense.description}
                  </td>
                  <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.category}
                  </td>
                  <td className="w-24 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="w-28 px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() =>
                        onToggleReimbursed(expense.id, !expense.reimbursed)
                      }
                      className={`p-1 rounded transition-colors duration-200 ${
                        expense.reimbursed
                          ? "text-green-600 hover:bg-green-100"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {expense.reimbursed ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="w-32 px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onDuplicate(expense)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                        title="Duplicate expense"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        title="Edit expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  {expense.description}
                </h3>
                <p className="text-sm text-gray-500">{expense.category}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() =>
                    onToggleReimbursed(expense.id, !expense.reimbursed)
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                    expense.reimbursed
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {expense.reimbursed ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Reimbursed</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" />
                      <span>Pending</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">{formatDate(expense.date)}</span>
              <span className="font-bold text-gray-900 text-base">
                {formatCurrency(expense.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">Actions:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onDuplicate(expense)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors duration-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => onEdit(expense)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors duration-200"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors duration-200"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;
