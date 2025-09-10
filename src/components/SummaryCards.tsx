import { CheckCircle, Clock, DollarSign } from "lucide-react";
import React from "react";
import { formatCurrency } from "../utils/expenseUtils";

interface SummaryCardsProps {
  total: number;
  reimbursed: number;
  pending: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  total,
  reimbursed,
  pending,
}) => {
  const cards = [
    {
      title: "Total Spent",
      amount: total,
      icon: DollarSign,
      color: "blue",
    },
    {
      title: "Reimbursed",
      amount: reimbursed,
      icon: CheckCircle,
      color: "green",
    },
    {
      title: "Pending",
      amount: pending,
      icon: Clock,
      color: "amber",
    },
  ];

  const getCardStyles = (color: string) => {
    const styles = {
      blue: "bg-blue-50 border-blue-200",
      green: "bg-green-50 border-green-200",
      amber: "bg-amber-50 border-amber-200",
    };
    return styles[color as keyof typeof styles];
  };

  const getIconStyles = (color: string) => {
    const styles = {
      blue: "text-blue-600",
      green: "text-green-600",
      amber: "text-amber-600",
    };
    return styles[color as keyof typeof styles];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(({ title, amount, icon: Icon, color }) => (
        <div
          key={title}
          className={`rounded-lg border p-6 ${getCardStyles(color)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(amount)}
              </p>
            </div>
            <Icon className={`w-8 h-8 ${getIconStyles(color)}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
