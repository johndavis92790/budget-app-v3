export interface History {
  date: string;
  type: string;
  category: string;
  tags: string[];
  value: number;
  description: string;
  editURL: string;
  id: string;
  fiscalYearId?: string;
  fiscalMonthId?: string;
  fiscalWeekId?: string;
  itemType: "history";
}

export interface Recurring {
  type: string;
  category: string;
  tags: string[];
  value: number;
  description: string;
  editURL: string;
  id: string;
  itemType: "recurring";
}

export interface FiscalWeek {
  number: string;
  start_date: string;
  end_date: string;
  year_title: string;
  month_id: string;
  itemType: string;
}
