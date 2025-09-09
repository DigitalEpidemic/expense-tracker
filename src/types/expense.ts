export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  reimbursed: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseFormData {
  description: string;
  amount: string;
  date: string;
  category: string;
  reimbursed: boolean;
}

export interface MonthlyGroup {
  monthYear: string;
  expenses: Expense[];
  total: number;
  reimbursed: number;
  pending: number;
}