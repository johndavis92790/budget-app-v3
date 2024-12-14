export interface Expense {
  date: string;
  type: "Expense" | "Refund";
  categories: string;
  tags: string[];
  value: number;
  notes: string;
}
