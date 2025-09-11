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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      style={{ overflow: "hidden" }}
    >
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-xl w-full max-w-[calc(100vw-16px)] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Match Reimbursements
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your reimbursement total to find matching expense
              combinations and bulk mark them as reimbursed.
              <br className="hidden sm:inline" />
              <span className="sm:hidden"> </span>
              Matches prioritize oldest expenses first.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0"
            aria-label="Close reimbursement modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 border-b border-gray-200">
          <label
            htmlFor="targetAmount"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Reimbursement Amount
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="168.60"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSearching}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !targetAmount}
              aria-label={
                isSearching ? "Searching for matches" : "Find matches"
              }
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-medium text-sm sm:text-base flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isSearching ? "Searching..." : "Find Matches"}
              </span>
              <span className="sm:hidden">
                {isSearching ? "Search..." : "Find"}
              </span>
            </button>
          </div>
        </div>

        {!hasSearched ? (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="p-4 sm:p-8 text-center text-gray-500">
              <Search className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium mb-2">
                Ready to find matches
              </p>
              <p className="text-xs sm:text-sm">
                You have {pendingExpenses.length} pending expense
                {pendingExpenses.length !== 1 ? "s" : ""} totaling{" "}
                {formatCurrency(
                  pendingExpenses.reduce((sum, e) => sum + e.amount, 0)
                )}
              </p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="p-4 sm:p-8 text-center text-gray-500">
              <div className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-4 sm:w-6 h-4 sm:h-6 text-gray-400" />
              </div>
              <p className="text-base sm:text-lg font-medium mb-2">
                No matches found
              </p>
              <p className="text-xs sm:text-sm">
                Try adjusting the amount or check if you have pending expenses
                that could match.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-3 sm:p-6">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-3">
                  Found {matches.length} possible match
                  {matches.length > 1 ? "es" : ""}
                  <span className="hidden sm:inline">
                    {!selectedMatch && " - Select one to proceed"}
                  </span>
                </h3>
                <div className="grid gap-2 sm:gap-3">
                  {matches.map((match, index) => {
                    const isSelected = selectedMatch === match;
                    const difference = Math.abs(
                      match.total - parseFloat(targetAmount)
                    );

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedMatch(match)}
                        className={`text-left p-2 sm:p-4 rounded-lg border-2 transition-colors duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1 sm:mb-2 gap-2">
                          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                            <span className="font-medium text-gray-900 text-xs sm:text-base truncate">
                              {formatMatchSummary(match)}
                            </span>
                            {match.exactMatch && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-1 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                                Exact
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-gray-900 text-xs sm:text-base">
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
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {match.expenses.length <= 1
                            ? match.expenses
                                .map(
                                  (expense) =>
                                    `${expense.description} (${formatDate(
                                      expense.date
                                    )})`
                                )
                                .join(", ")
                            : `${match.expenses
                                .slice(0, 1)
                                .map(
                                  (e) =>
                                    `${e.description} (${formatDate(e.date)})`
                                )
                                .join(", ")} and ${
                                match.expenses.length - 1
                              } more`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedMatch && (
              <div className="flex-shrink-0 p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-1 sm:gap-2">
                  <h4 className="font-medium text-gray-900 text-xs sm:text-base">
                    Selected Match ({selectedMatch.expenses.length} expense
                    {selectedMatch.expenses.length > 1 ? "s" : ""})
                  </h4>
                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-gray-900 text-xs sm:text-base">
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
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2 mb-2 sm:mb-4">
                  {selectedMatch.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-white rounded p-1 sm:p-2 border border-gray-200 text-xs"
                    >
                      <div className="font-medium text-gray-900 truncate text-xs sm:text-sm">
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
                  className="w-full bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-xs sm:text-base"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">
                    Mark {selectedMatch.expenses.length} Expense
                    {selectedMatch.expenses.length > 1 ? "s" : ""} as Reimbursed
                  </span>
                  <span className="sm:hidden">
                    Mark as Reimbursed ({selectedMatch.expenses.length})
                  </span>
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
