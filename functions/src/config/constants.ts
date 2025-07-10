// Constants for the budget app cloud functions

export const SECRET_TOKEN = "9a7ce018-5796-427d-8a67-3f204d4419af";

export const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";

// History sheet constants
export const HISTORY_TABLE_NAME = "History";
export const HISTORY_FIRST_COLUMN = "A";
export const HISTORY_LAST_COLUMN = "M";
export const HISTORY_RANGE = `${HISTORY_TABLE_NAME}!${HISTORY_FIRST_COLUMN}1:${HISTORY_LAST_COLUMN}`;

// Recurring sheet constants
export const RECURRING_TABLE_NAME = "Recurring";
export const RECURRING_FIRST_COLUMN = "A";
export const RECURRING_LAST_COLUMN = "H";
export const RECURRING_RANGE = `${RECURRING_TABLE_NAME}!${RECURRING_FIRST_COLUMN}1:${RECURRING_LAST_COLUMN}`;

// Goals constants
export const WEEKLY_GOAL_RANGE = "Goals!A2";
export const MONTHLY_GOAL_RANGE = "Goals!B2";

// Metadata constants
export const METADATA_RANGE = "Metadata!A1:B";

// Logs sheet constants
export const LOGS_TABLE_NAME = "Logs";
export const LOGS_FIRST_COLUMN = "A";
export const LOGS_LAST_COLUMN = "D";
export const LOGS_RANGE = `${LOGS_TABLE_NAME}!${LOGS_FIRST_COLUMN}1:${LOGS_LAST_COLUMN}`;

// Fiscal data ranges
export const FISCAL_WEEKS_RANGE = "Fiscal Weeks!A1:F";
export const FISCAL_MONTHS_RANGE = "Fiscal Months!A1:D";
export const FISCAL_YEARS_RANGE = "Fiscal Years!A1:D";

// HSA sheet constants
export const HSA_TABLE_NAME = "HSA";
export const HSA_FIRST_COLUMN = "A";
export const HSA_LAST_COLUMN = "D";
export const HSA_RANGE = `${HSA_TABLE_NAME}!${HSA_FIRST_COLUMN}1:${HSA_LAST_COLUMN}`;

// Default column mappings (used as fallback if header row can't be read)
export const defaultColumnMappings = {
  HISTORY: {
    DATE: 0,
    TYPE: 1,
    CATEGORY: 2,
    TAGS: 3,
    VALUE: 4,
    HSA: 5,
    DESCRIPTION: 6,
    EDIT_URL: 7,
    HYPERLINK: 8,
    ID: 9,
    FISCAL_YEAR_ID: 10,
    FISCAL_MONTH_ID: 11,
    FISCAL_WEEK_ID: 12,
  },
  RECURRING: {
    TYPE: 0,
    CATEGORY: 1,
    TAGS: 2,
    VALUE: 3,
    DESCRIPTION: 4,
    EDIT_URL: 5,
    HYPERLINK: 6,
    ID: 7,
  },
  FISCAL_WEEKS: {
    ID: 0,
    NUMBER: 1,
    START_DATE: 2,
    END_DATE: 3,
    YEAR_TITLE: 4,
    MONTH_ID: 5,
  },
  FISCAL_MONTHS: {
    ID: 0,
    START_DATE: 1,
    END_DATE: 2,
    YEAR_TITLE: 3,
  },
  FISCAL_YEARS: {
    ID: 0,
    TITLE: 1,
    START_DATE: 2,
    END_DATE: 3,
  },
  LOGS: {
    TIMESTAMP: 0,
    USER_EMAIL: 1,
    ACTION: 2,
    DATA: 3,
    ERROR: 4,
  },
  METADATA: {
    CATEGORY: 0,
    TAG: 1,
  },
  HSA: {
    HISTORY_ID: 0,
    REIMBURSEMENT_AMOUNT: 1,
    REIMBURSEMENT_DATE: 2,
    NOTES: 3,
  },
};
