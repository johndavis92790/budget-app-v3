import {
  HISTORY_FIRST_COLUMN,
  HISTORY_LAST_COLUMN,
  HISTORY_RANGE,
  HISTORY_TABLE_NAME,
  RECURRING_FIRST_COLUMN,
  RECURRING_LAST_COLUMN,
  RECURRING_RANGE,
  RECURRING_TABLE_NAME,
  SPREADSHEET_ID,
} from "../config/constants";
import {
  columnMappings,
  getSheetData,
  createSheetRow,
  appendDataToSheet,
  updateSheetRow,
  findRowIndexById,
  deleteRow,
} from "../utils/sheets";
import { addMissingTags } from "../handlers/expenses/metadata";
import { convertToMMDDYYYY } from "../utils/fiscal";

/**
 * Inserts a History or Recurring item
 * @param sheets - The sheets API instance
 * @param data - The data for the item to insert
 * @param itemType - The type of item to insert ("history" or "recurring")
 */
export async function insertItem(
  sheets: any,
  data: any,
  itemType: "history" | "recurring"
) {
  const isRecurring = itemType === "recurring";
  const range = isRecurring ? RECURRING_RANGE : HISTORY_RANGE;
  // Add any missing tags to the Metadata sheet
  await addMissingTags(sheets, data.tags);

  let sheetType = isRecurring ? ("RECURRING" as const) : ("HISTORY" as const);

  if (isRecurring) {
    // Create data object for recurring item
    const recurringData = {
      TYPE: data.type,
      CATEGORY: data.category,
      TAGS: data.tags.join(", "),
      VALUE: data.value,
      DESCRIPTION: data.description || "",
      ID: data.id,
    };

    // Use our robust helper to create the row
    const rowData = createSheetRow(recurringData, sheetType);
    await appendDataToSheet(sheets, range, [rowData]);
  } else {
    // Format date as MM/DD/YYYY
    const dateFormatted = convertToMMDDYYYY(data.date);
    const hsaDateFormatted = data.hsaDate ? convertToMMDDYYYY(data.hsaDate) : "";
    
    // Create data object for history item
    const historyData = {
      DATE: dateFormatted,
      TYPE: data.type,
      CATEGORY: data.category,
      TAGS: data.tags.join(", "),
      VALUE: data.value,
      HSA: data.hsa === true ? "TRUE" : "FALSE",
      DESCRIPTION: data.description || "",
      ID: data.id,
      FISCAL_YEAR_ID: data.fiscalYearId,
      FISCAL_MONTH_ID: data.fiscalMonthId,
      FISCAL_WEEK_ID: data.fiscalWeekId,
      HSA_AMOUNT: data.hsaAmount,
      HSA_DATE: hsaDateFormatted,
      HSA_NOTES: data.hsaNotes,
    };

    // Use our robust helper to create the row
    const rowData = createSheetRow(historyData, sheetType);
    await appendDataToSheet(sheets, range, [rowData]);
  }
}

/**
 * Updates a History or Recurring item
 * @param sheets - The sheets API instance
 * @param data - The data for the item to update
 * @param itemType - The type of item to update ("history" or "recurring")
 */
export async function updateItem(
  sheets: any,
  data: any,
  itemType: "history" | "recurring"
) {
  const isRecurring = itemType === "recurring";
  const rangeBase = isRecurring ? RECURRING_TABLE_NAME : HISTORY_TABLE_NAME;
  const firstCol = isRecurring ? RECURRING_FIRST_COLUMN : HISTORY_FIRST_COLUMN;
  const lastCol = isRecurring ? RECURRING_LAST_COLUMN : HISTORY_LAST_COLUMN;
  const rowIndex = data.rowIndex;
  const rowRange = `${rangeBase}!${firstCol}${rowIndex}:${lastCol}${rowIndex}`;

  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange,
  });
  const existingRow = existingRes.data.values?.[0];
  if (!existingRow) {
    throw new Error(`${itemType} item not found at rowIndex ${rowIndex}`);
  }

  // Select the appropriate sheet type for our column mappings
  const sheetType = isRecurring ? ("RECURRING" as const) : ("HISTORY" as const);
  const colMap = columnMappings[sheetType];

  // Use column mapping to get the ID column index
  const existingId = existingRow[colMap.ID];
  if (!existingId) {
    throw new Error(`ID not found in the existing ${itemType} row.`);
  }

  // Add any new tags to the metadata sheet
  await addMissingTags(sheets, data.tags);

  // Common data for both item types
  const baseData: Record<string, any> = {
    TYPE: data.type,
    CATEGORY: data.category,
    TAGS: data.tags.join(", "),
    VALUE: data.value,
    DESCRIPTION: data.description || "",
    ID: existingId,
  };

  // Add type-specific fields
  if (!isRecurring) {
    // Add history-specific fields
    baseData.DATE = convertToMMDDYYYY(data.date);
    baseData.HSA = data.hsa === true ? "TRUE" : "FALSE";
    baseData.FISCAL_YEAR_ID =
      data.fiscalYearId || existingRow[colMap.FISCAL_YEAR_ID];
    baseData.FISCAL_MONTH_ID =
      data.fiscalMonthId || existingRow[colMap.FISCAL_MONTH_ID];
    baseData.FISCAL_WEEK_ID =
      data.fiscalWeekId || existingRow[colMap.FISCAL_WEEK_ID];
  }

  if (baseData.HSA === "TRUE") {
    baseData.HSA_AMOUNT = data.hsaAmount;
    if (data.hsaDate) {
      baseData.HSA_DATE = convertToMMDDYYYY(data.hsaDate);
    }
    if (data.hsaNotes) {
      baseData.HSA_NOTES = data.hsaNotes;
    }
  }

  // Use our robust helper to create the row data
  const rowData = createSheetRow(baseData, sheetType);

  // Update the sheet with the new data
  await updateSheetRow(sheets, rowRange, [rowData]);

  return existingRow;
}

/**
 * Deletes a History or Recurring item by ID
 * @param sheets - The sheets API instance
 * @param itemType - The type of item to delete ("history" or "recurring")
 * @param id - The ID of the item to delete
 */
export async function deleteItem(
  sheets: any,
  itemType: "history" | "recurring",
  id: string
) {
  const spreadsheetRes = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const tableName =
    itemType === "history" ? HISTORY_TABLE_NAME : RECURRING_TABLE_NAME;
  const tableSheet = spreadsheetRes.data.sheets?.find(
    (sh: any) => sh.properties?.title === tableName,
  );
  if (!tableSheet || !tableSheet.properties?.sheetId) {
    throw new Error(`Failed to retrieve sheetId for ${tableName}.`);
  }

  const rangeAll = itemType === "history" ? HISTORY_RANGE : RECURRING_RANGE;
  const rowsAll = await getSheetData(sheets, rangeAll, false);
  rowsAll.shift(); // remove header row

  // Get the ID column index based on sheet type
  const idColIndex =
    itemType === "history"
      ? columnMappings.HISTORY.ID
      : columnMappings.RECURRING.ID;

  const rowIndex = findRowIndexById(rowsAll, id, idColIndex);
  if (rowIndex === -1) {
    throw new Error(`${itemType} item with ID ${id} not found.`);
  }

  // Convert to 1-based + header
  const deleteRowIndex = rowIndex + 2;
  await deleteRow(
    sheets,
    SPREADSHEET_ID,
    tableSheet.properties.sheetId,
    deleteRowIndex,
  );
}
