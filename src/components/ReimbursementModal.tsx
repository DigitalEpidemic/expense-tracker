import { Check, DollarSign, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Expense } from "../types/expense";
import { formatCurrency, formatDate } from "../utils/expenseUtils";
import {
  findReimbursementMatches,
  formatMatchSummary,
  ReimbursementMatch,
} from "../utils/reimbursementMatcher";

interface ReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onMarkReimbursed: (expenseIds: string[]) => Promise<void>;
}

const ReimbursementModal: React.FC<ReimbursementModalProps> = ({
  isOpen,
  onClose,
  expenses,
  onMarkReimbursed,
}) => {
  const [targetAmount, setTargetAmount] = useState("");
  const [matches, setMatches] = useState<ReimbursementMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<ReimbursementMatch | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const pendingExpenses = useMemo(() => {
    return expenses.filter((expense) => !expense.reimbursed);
  }, [expenses]);

  useEffect(() => {
    if (!isOpen) {
      setTargetAmount("");
      setMatches([]);
      setSelectedMatch(null);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    const amount = parseFloat(targetAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const foundMatches = findReimbursementMatches(pendingExpenses, amount);
      setMatches(foundMatches);
      setSelectedMatch(foundMatches[0] || null);

      if (foundMatches.length === 0) {
        toast.error("No matching expense combinations found");
      } else {
        toast.success(
          `Found ${foundMatches.length} possible match${
            foundMatches.length > 1 ? "es" : ""
          }`
        );
      }
    } catch (error) {
      console.error("Error finding matches:", error);
      toast.error("Error searching for matches");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkReimbursed = async () => {
    if (!selectedMatch) return;

    try {
      const expenseIds = selectedMatch.expenses.map((expense) => expense.id);
      await onMarkReimbursed(expenseIds);
      toast.success(
        `Marked ${selectedMatch.expenses.length} expense${
          selectedMatch.expenses.length > 1 ? "s" : ""
        } as reimbursed`
      );
      onClose();
    } catch (error) {
      console.error("Error marking expenses as reimbursed:", error);
      toast.error("Failed to mark expenses as reimbursed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching && targetAmount) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      style={{ overflow: "hidden" }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Match Reimbursements
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your reimbursement total to find matching expense
              combinations and bulk mark them as reimbursed.
              <br />
              Matches prioritize oldest expenses first.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Close reimbursement modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                htmlFor="targetAmount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reimbursement Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="520.21"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSearching}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isSearching || !targetAmount}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-medium"
              >
                <Search className="w-4 h-4" />
                {isSearching ? "Searching..." : "Find Matches"}
              </button>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Ready to find matches</p>
              <p className="text-sm">
                You have {pendingExpenses.length} pending expense
                {pendingExpenses.length !== 1 ? "s" : ""} totaling{" "}
                {formatCurrency(
                  pendingExpenses.reduce((sum, e) => sum + e.amount, 0)
                )}
              </p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-8 text-center text-gray-500">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">No matches found</p>
              <p className="text-sm">
                Try adjusting the amount or check if you have pending expenses
                that could match.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Found {matches.length} possible match
                  {matches.length > 1 ? "es" : ""}
                  {!selectedMatch && " - Select one to proceed"}
                </h3>
                <div className="grid gap-3">
                  {matches.map((match, index) => {
                    const isSelected = selectedMatch === match;
                    const difference = Math.abs(
                      match.total - parseFloat(targetAmount)
                    );

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedMatch(match)}
                        className={`text-left p-4 rounded-lg border-2 transition-colors duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {formatMatchSummary(match)}
                            </span>
                            {match.exactMatch && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                Exact
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(match.total)}
                            </div>
                            {!match.exactMatch && (
                              <div className="text-xs text-gray-500">
                                {difference > 0 ? "+" : ""}
                                {formatCurrency(
                                  match.total - parseFloat(targetAmount)
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {match.expenses.length <= 3
                            ? match.expenses
                                .map(
                                  (expense) =>
                                    `${expense.description} (${formatDate(
                                      expense.date
                                    )})`
                                )
                                .join(", ")
                            : `${match.expenses
                                .slice(0, 3)
                                .map(
                                  (e) =>
                                    `${e.description} (${formatDate(e.date)})`
                                )
                                .join(", ")} and ${
                                match.expenses.length - 3
                              } more`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedMatch && (
              <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Selected Match ({selectedMatch.expenses.length} expense
                    {selectedMatch.expenses.length > 1 ? "s" : ""})
                  </h4>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      Total: {formatCurrency(selectedMatch.total)}
                    </div>
                    {!selectedMatch.exactMatch && (
                      <div className="text-xs text-gray-500">
                        Difference:{" "}
                        {formatCurrency(
                          Math.abs(
                            selectedMatch.total - parseFloat(targetAmount)
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedMatch.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-white rounded-lg p-2 border border-gray-200 text-sm"
                    >
                      <div className="font-medium text-gray-900 truncate max-w-[200px]">
                        {expense.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(expense.date)} •{" "}
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleMarkReimbursed}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                >
                  <Check className="w-5 h-5" />
                  Mark {selectedMatch.expenses.length} Expense
                  {selectedMatch.expenses.length > 1 ? "s" : ""} as Reimbursed
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReimbursementModal;
