import { SheetColumnMappings, ColumnMapping } from "../types";
import * as constants from "../config/constants";

// Initialize empty column mappings
export let columnMappings: SheetColumnMappings = {
  HISTORY: {},
  RECURRING: {},
  FISCAL_WEEKS: {},
  FISCAL_MONTHS: {},
  FISCAL_YEARS: {},
  LOGS: {},
  METADATA: {},
};

/**
 * Function to initialize column mappings from header rows
 * @param sheets - The sheets API instance
 */
export async function initializeColumnMappings(sheets: any): Promise<void> {
  try {
    const historyHeaders = await getSheetData(
      sheets,
      `${constants.HISTORY_TABLE_NAME}!${constants.HISTORY_FIRST_COLUMN}1:${constants.HISTORY_LAST_COLUMN}1`,
      false,
    );
    const recurringHeaders = await getSheetData(
      sheets,
      `${constants.RECURRING_TABLE_NAME}!${constants.RECURRING_FIRST_COLUMN}1:${constants.RECURRING_LAST_COLUMN}1`,
      false,
    );
    const fiscalWeeksHeaders = await getSheetData(
      sheets,
      constants.FISCAL_WEEKS_RANGE,
      false,
    );
    const fiscalMonthsHeaders = await getSheetData(
      sheets,
      constants.FISCAL_MONTHS_RANGE,
      false,
    );
    const fiscalYearsHeaders = await getSheetData(
      sheets,
      constants.FISCAL_YEARS_RANGE,
      false,
    );
    const logsHeaders = await getSheetData(
      sheets,
      constants.LOGS_RANGE,
      false,
    );
    const metadataHeaders = await getSheetData(sheets, constants.METADATA_RANGE, false);

    if (historyHeaders && historyHeaders.length > 0) {
      columnMappings.HISTORY = createMappingFromHeaders(historyHeaders[0]);
    } else {
      columnMappings.HISTORY = { ...constants.defaultColumnMappings.HISTORY };
    }

    if (recurringHeaders && recurringHeaders.length > 0) {
      columnMappings.RECURRING = createMappingFromHeaders(recurringHeaders[0]);
    } else {
      columnMappings.RECURRING = {
        ...constants.defaultColumnMappings.RECURRING,
      };
    }

    if (fiscalWeeksHeaders && fiscalWeeksHeaders.length > 0) {
      columnMappings.FISCAL_WEEKS = createMappingFromHeaders(
        fiscalWeeksHeaders[0],
      );
    } else {
      columnMappings.FISCAL_WEEKS = {
        ...constants.defaultColumnMappings.FISCAL_WEEKS,
      };
    }

    if (fiscalMonthsHeaders && fiscalMonthsHeaders.length > 0) {
      columnMappings.FISCAL_MONTHS = createMappingFromHeaders(
        fiscalMonthsHeaders[0],
      );
    } else {
      columnMappings.FISCAL_MONTHS = {
        ...constants.defaultColumnMappings.FISCAL_MONTHS,
      };
    }

    if (fiscalYearsHeaders && fiscalYearsHeaders.length > 0) {
      columnMappings.FISCAL_YEARS = createMappingFromHeaders(
        fiscalYearsHeaders[0],
      );
    } else {
      columnMappings.FISCAL_YEARS = {
        ...constants.defaultColumnMappings.FISCAL_YEARS,
      };
    }

    if (logsHeaders && logsHeaders.length > 0) {
      columnMappings.LOGS = createMappingFromHeaders(logsHeaders[0]);
    } else {
      columnMappings.LOGS = { ...constants.defaultColumnMappings.LOGS };
    }

    if (metadataHeaders && metadataHeaders.length > 0) {
      columnMappings.METADATA = createMappingFromHeaders(metadataHeaders[0]);
    } else {
      columnMappings.METADATA = { ...constants.defaultColumnMappings.METADATA };
    }

    // Merge with default mappings for any missing columns
    for (const sheet in constants.defaultColumnMappings) {
      const sheetKey = sheet as keyof SheetColumnMappings;
      columnMappings[sheetKey] = {
        ...constants.defaultColumnMappings[sheetKey],
        ...columnMappings[sheetKey],
      };
    }

    console.log("Column mappings initialized successfully");
  } catch (error) {
    console.error("Error initializing column mappings, using defaults:", error);
    // Use default column mappings as fallback
    columnMappings = { ...constants.defaultColumnMappings };
  }
}

/**
 * Helper function to create mappings from header row
 * @param headers - Array of header values
 * @returns ColumnMapping object
 */
function createMappingFromHeaders(headers: any[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((header, index) => {
    if (header) {
      // Convert header to uppercase for consistent mapping
      const normalizedHeader = header.toString().trim().toUpperCase();
      mapping[normalizedHeader] = index;
    }
  });
  return mapping;
}

/**
 * Helper to get data from a sheet by range
 * @param sheets - The sheets API instance
 * @param range - Base range for the sheet (e.g. 'History!A:Z')
 * @param removeHeader - Whether to remove the first row (header row)
 * @returns Array of rows from the sheet
 */
export async function getSheetData(
  sheets: any,
  range: string,
  removeHeader = true,
): Promise<any[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: constants.SPREADSHEET_ID,
    range,
  });

  let rows = response.data.values || [];

  // If removeHeader is true, remove the first row (header row)
  if (removeHeader && rows.length > 0) {
    rows = rows.slice(1);
  }

  return rows;
}

/**
 * Helper to find the index of a row by ID
 * @param rows - Array of rows from the sheet
 * @param id - ID to search for
 * @param idColIndex - Column index where the ID is located
 */
export function findRowIndexById(
  rows: any[],
  id: string,
  idColIndex: number,
): number {
  return rows.findIndex((row) => row[idColIndex] === id);
}

/**
 * Helper to delete a row from a sheet by row index
 * @param sheets - The sheets API instance
 * @param spreadsheetId - The ID of the spreadsheet
 * @param sheetId - The ID of the sheet
 * @param rowIndex - The index of the row to delete
 */
export async function deleteRow(
  sheets: any,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number,
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

/**
 * Helper to update a single cell in a sheet by column mappings
 * @param sheets - The sheets API instance
 * @param range - Base range for the sheet (e.g. 'History!A:Z')
 * @param newGoalValue - The new value to set
 */
export async function updateSingleCellGoal(
  sheets: any,
  range: string,
  newGoalValue: number,
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: constants.SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [[newGoalValue]] },
  });
}

/**
 * Helper to append data to a sheet by column mappings rather than array positions
 * @param sheets - The sheets API instance
 * @param range - Base range for the sheet (e.g. 'History!A:Z')
 * @param rowValues - Array of rows to append
 */
export async function appendDataToSheet(
  sheets: any,
  range: string,
  rowValues: any[][],
) {
  return await sheets.spreadsheets.values.append({
    spreadsheetId: constants.SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: { values: rowValues },
  });
}

/**
 * Helper to construct a row for a sheet using column mappings
 * This ensures data is always in the correct column regardless of order
 * @param data - Data object with values to insert
 * @param sheetType - The type of sheet (key in columnMappings)
 * @param valueMapper - Optional function to transform values before insertion
 */
export function createSheetRow(
  data: Record<string, any>,
  sheetType: keyof SheetColumnMappings,
  valueMapper?: (key: string, val: any) => any,
): any[] {
  const colMap = columnMappings[sheetType];

  // Find the maximum column index to ensure array is large enough
  const maxColIndex = Math.max(...Object.values(colMap));
  const row = new Array(maxColIndex + 1).fill("");

  // Map the data to the correct columns
  Object.entries(data).forEach(([key, value]) => {
    const normalizedKey = key.toUpperCase().replace(/\s+/g, "_");
    const colIndex = colMap[normalizedKey];

    if (colIndex !== undefined) {
      row[colIndex] = valueMapper ? valueMapper(key, value) : value;
    }
  });
  return row;
}

/**
 * Helper to update a row in a sheet by column mappings
 * @param sheets - The sheets API instance
 * @param range - Base range for the sheet (e.g. 'History!A:Z')
 * @param rowValues - Array of rows to update
 */
export async function updateSheetRow(
  sheets: any,
  range: string,
  rowValues: any[][],
) {
  return await sheets.spreadsheets.values.update({
    spreadsheetId: constants.SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: rowValues },
  });
}

/**
 * Helper to parse a cell value into a number
 * @param cellVal - The cell value to parse
 * @returns Parsed number or 0 if invalid
 */
export function parseCellValue(cellVal: string | undefined): number {
  if (!cellVal) return 0;
  return parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
}

/**
 * Helper to convert an array of objects to an object by ID
 * @param arr - Array of objects with an id property
 * @returns Object with id as key
 */
export function convertArrayToObjectById(arr: any[]): Record<string, any> {
  return arr.reduce(
    (obj, item) => {
      const { id, ...rest } = item;
      obj[id] = rest;
      return obj;
    },
    {} as Record<string, any>,
  );
}
