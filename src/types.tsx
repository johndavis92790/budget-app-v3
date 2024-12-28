export interface History {
  date: string;
  type: string;
  category: string;
  tags: string[];
  value: number;
  notes: string;
  editURL: string;
  id: string;
  fiscalYearId?: string;
  fiscalMonthId?: string;
  fiscalWeekId?: string;
  itemType: "history";
}

export interface Recurring {
  type: string;
  tags: string[];
  value: number;
  name: string;
  editURL: string;
  id: string;
  itemType: "recurring";
}
