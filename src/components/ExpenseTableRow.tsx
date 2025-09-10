import { Check, Copy, Edit2, Trash2, X } from "lucide-react";
import React from "react";
import { Expense } from "../types/expense";
import { formatCurrency, formatDate } from "../utils/expenseUtils";

interface ExpenseTableRowProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onToggleReimbursed: (id: string, reimbursed: boolean) => void;
  onDuplicate: (expense: Expense) => void;
}

const ExpenseTableRow: React.FC<ExpenseTableRowProps> = ({
  expense,
  onEdit,
  onDelete,
  onToggleReimbursed,
  onDuplicate,
}) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(expense.date)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
      <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {expense.category}
      </td>
      <td className="w-24 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
        {formatCurrency(expense.amount)}
      </td>
      <td className="w-28 px-6 py-4 whitespace-nowrap text-center">
        <button
          onClick={() => onToggleReimbursed(expense.id, !expense.reimbursed)}
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
  );
};

export default ExpenseTableRow;
