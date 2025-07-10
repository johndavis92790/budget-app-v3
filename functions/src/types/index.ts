// Types and interfaces for the budget app cloud functions

export interface FiscalYear {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  itemType: "fiscalYear";
}

export interface FiscalMonth {
  id: string;
  start_date: string;
  end_date: string;
  year_title: string;
  itemType: "fiscalMonth";
}

export interface FiscalWeek {
  id: string;
  number: string;
  start_date: string;
  end_date: string;
  year_title: string;
  month_id: string;
  itemType: "fiscalWeek";
}

export interface IncomingObject {
  date: string;
  // ... other fields as needed
}

// Define sheet column mapping interfaces
export interface ColumnMapping {
  [columnName: string]: number;
}

export interface SheetColumnMappings {
  HISTORY: ColumnMapping;
  RECURRING: ColumnMapping;
  FISCAL_WEEKS: ColumnMapping;
  FISCAL_MONTHS: ColumnMapping;
  FISCAL_YEARS: ColumnMapping;
  LOGS: ColumnMapping;
  METADATA: ColumnMapping;
  HSA: ColumnMapping;
}
