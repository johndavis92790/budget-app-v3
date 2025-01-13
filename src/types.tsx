export interface History {
  date: string;
  userEmail: string | null | undefined;
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
  userEmail: string | null | undefined;
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

export interface FiscalMonth {
  id: string;
  start_date: string;
  end_date: string;
  year_title: string;
  itemType: string;
}

export interface UpdateGoal {
  itemType: "weeklyGoal" | "monthlyGoal";
  value: number;
  userEmail: string | null | undefined;
}

export interface NotificationPayload {
  title: string | undefined;
  body: string | undefined;
}
