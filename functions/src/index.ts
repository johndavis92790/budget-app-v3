import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

// ---------------------- CONSTANTS & INTERFACES ----------------------

const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";

const HISTORY_TABLE_NAME = "History";
const HISTORY_FIRST_COLUMN = "A";
const HISTORY_LAST_COLUMN = "L";
const HISTORY_RANGE = `${HISTORY_TABLE_NAME}!${HISTORY_FIRST_COLUMN}1:${HISTORY_LAST_COLUMN}`;

const RECURRING_TABLE_NAME = "Recurring";
const RECURRING_FIRST_COLUMN = "A";
const RECURRING_LAST_COLUMN = "H";
const RECURRING_RANGE = `${RECURRING_TABLE_NAME}!${RECURRING_FIRST_COLUMN}1:${RECURRING_LAST_COLUMN}`;

const WEEKLY_GOAL_RANGE = "Goals!A2";
const MONTHLY_GOAL_RANGE = "Goals!B2";

const METADATA_RANGE = "Metadata!A1:C";

const FISCAL_WEEKS_RANGE = "Fiscal Weeks!A1:F";
const FISCAL_MONTHS_RANGE = "Fiscal Months!A1:D";
const FISCAL_YEARS_RANGE = "Fiscal Years!A1:D";

interface FiscalYear {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  itemType: "fiscalYear";
}

interface FiscalMonth {
  id: string;
  start_date: string;
  end_date: string;
  year_title: string;
  itemType: "fiscalMonth";
}

interface FiscalWeek {
  id: string;
  number: string;
  start_date: string;
  end_date: string;
  year_title: string;
  month_id: string;
  itemType: "fiscalWeek";
}

interface IncomingObject {
  date: string;
  // ... other fields as needed
}

// ---------------------- CACHED FISCAL DATA ----------------------

let cachedFiscalYears: FiscalYear[] | null = null;
let cachedFiscalMonths: FiscalMonth[] | null = null;
let cachedFiscalWeeks: FiscalWeek[] | null = null;

// ---------------------- GENERAL HELPER FUNCTIONS ----------------------

async function getSheetData(
  sheets: any,
  range: string,
  removeHeader = true
): Promise<any[]> {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = resp.data.values || [];
  return removeHeader ? rows.slice(1) : rows;
}

function findRowIndexById(rows: any[], id: string, idColIndex: number): number {
  return rows.findIndex((row) => row[idColIndex] === id);
}

async function deleteRow(
  sheets: any,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
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

async function updateSingleCellGoal(
  sheets: any,
  range: string,
  newGoalValue: number
) {
  // For both weeklyGoal & monthlyGoal
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newGoalValue]] },
  });
}

async function appendDataToSheet(
  sheets: any,
  range: string,
  rowValues: any[][]
) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rowValues },
  });
}

async function updateSheetRow(sheets: any, range: string, rowValues: any[][]) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rowValues },
  });
}

function parseCellValue(cellVal: string | undefined): number {
  if (!cellVal) return 0;
  return parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
}

function convertToMMDDYYYY(isoDateStr: string): string {
  const [yyyy, mm, dd] = isoDateStr.split("-");
  return `${parseInt(mm, 10)}/${parseInt(dd, 10)}/${yyyy}`;
}

function isExpenseType(type: string) {
  return type === "Expense" || type === "Recurring Expense";
}

// ---------------------- FISCAL HELPERS ----------------------

async function fetchAndCacheFiscalData(sheets: any): Promise<void> {
  if (cachedFiscalYears && cachedFiscalMonths && cachedFiscalWeeks) return;

  const [fyRows, fmRows, fwRows] = await Promise.all([
    getSheetData(sheets, FISCAL_YEARS_RANGE),
    getSheetData(sheets, FISCAL_MONTHS_RANGE),
    getSheetData(sheets, FISCAL_WEEKS_RANGE),
  ]);

  cachedFiscalYears = fyRows.map((row) => ({
    id: row[0],
    title: row[1],
    start_date: row[2],
    end_date: row[3],
    itemType: "fiscalYear" as const,
  }));

  cachedFiscalMonths = fmRows.map((row) => ({
    id: row[0],
    start_date: row[1],
    end_date: row[2],
    year_title: row[3],
    itemType: "fiscalMonth" as const,
  }));

  cachedFiscalWeeks = fwRows.map((row) => ({
    id: row[0],
    number: row[1],
    start_date: row[2],
    end_date: row[3],
    year_title: row[4],
    month_id: row[5],
    itemType: "fiscalWeek" as const,
  }));
}

function getFiscalIDs(
  item: IncomingObject,
  fiscalYears: FiscalYear[],
  fiscalMonths: FiscalMonth[],
  fiscalWeeks: FiscalWeek[]
) {
  const date = new Date(item.date);
  if (isNaN(date.getTime())) {
    console.error(`Invalid date: ${item.date}`);
    return null;
  }
  const fy = fiscalYears.find((year) => {
    const start = new Date(year.start_date);
    const end = new Date(year.end_date);
    return date >= start && date <= end;
  });
  if (!fy) {
    console.error("No Fiscal Year found for date:", item.date);
    return null;
  }
  const fm = fiscalMonths.find((month) => {
    if (month.year_title !== fy.title) return false;
    const start = new Date(month.start_date);
    const end = new Date(month.end_date);
    return date >= start && date <= end;
  });
  if (!fm) {
    console.error("No Fiscal Month found for date:", item.date);
    return null;
  }
  const fw = fiscalWeeks.find((week) => {
    if (week.year_title !== fy.title || week.month_id !== fm.id) return false;
    const start = new Date(week.start_date);
    const end = new Date(week.end_date);
    return date >= start && date <= end;
  });
  if (!fw) {
    console.error("No Fiscal Week found for date:", item.date);
    return null;
  }
  return {
    fiscalYearId: fy.id,
    fiscalMonthId: fm.id,
    fiscalWeekId: fw.id,
  };
}

async function isSameFiscalWeekById(fiscalWeekId: string, sheets: any) {
  const allRows = await getSheetData(sheets, FISCAL_WEEKS_RANGE);
  const found = allRows.find((row) => row[0] === fiscalWeekId);
  if (!found) throw new Error("No matching fiscal week found.");
  return true;
}

async function isSameFiscalMonthById(fiscalMonthId: string, sheets: any) {
  const allRows = await getSheetData(sheets, FISCAL_MONTHS_RANGE);
  const found = allRows.find((row) => row[0] === fiscalMonthId);
  if (!found) throw new Error("No matching fiscal month found.");
  return true;
}

function convertArrayToObjectById(arr: any[]): Record<string, any> {
  return arr.reduce(
    (obj, item) => {
      const { id, ...rest } = item;
      obj[id] = rest;
      return obj;
    },
    {} as Record<string, any>
  );
}

// ---------------------- TAGS HELPER ----------------------

async function addMissingTags(
  sheets: any,
  tags: string[],
  isRecurring: boolean
) {
  if (!tags || tags.length === 0) return;

  const listsRows = await getSheetData(sheets, METADATA_RANGE, false);
  const dataRows = listsRows.slice(1);
  const colIndex = isRecurring ? 2 : 1;
  const existingTags = dataRows
    .map((row) => (row[colIndex] ? row[colIndex].trim() : ""))
    .filter(Boolean);

  const newTags = tags.filter((tag) => !existingTags.includes(tag));
  if (newTags.length === 0) return;

  const rowsToAppend = newTags.map((tag) =>
    isRecurring ? ["", "", tag] : ["", tag, ""]
  );
  await appendDataToSheet(sheets, METADATA_RANGE, rowsToAppend);
}

// ---------------------- GOAL ADJUSTMENT HELPER ----------------------

async function adjustGoalIfSameFiscalPeriod(
  sheets: any,
  oldValue: number,
  newValue: number,
  itemType: string,
  fiscalWeekId: string | null,
  fiscalMonthId: string | null
) {
  // If the item type indicates an Expense, we typically invert the difference for goals
  // if it’s positive vs. negative. We replicate the step-by-step from your original code.
  if (fiscalWeekId) {
    try {
      const sameWeek = await isSameFiscalWeekById(fiscalWeekId, sheets);
      if (sameWeek) {
        const wgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: WEEKLY_GOAL_RANGE,
        });
        const rawWG = wgData.data.values?.[0]?.[0] || "0";
        let weeklyGoal = parseFloat(rawWG.replace(/[^0-9.-]/g, ""));

        if (newValue > oldValue) {
          const difference = newValue - oldValue;
          weeklyGoal = isExpenseType(itemType)
            ? weeklyGoal - difference
            : weeklyGoal + difference;
        } else if (newValue < oldValue) {
          const difference = oldValue - newValue;
          weeklyGoal = isExpenseType(itemType)
            ? weeklyGoal + difference
            : weeklyGoal - difference;
        }
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, weeklyGoal);
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-week] error:", err);
    }
  }

  if (fiscalMonthId) {
    try {
      const sameMonth = await isSameFiscalMonthById(fiscalMonthId, sheets);
      if (sameMonth) {
        const mgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMG = mgData.data.values?.[0]?.[0] || "0";
        let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));

        if (newValue > oldValue) {
          const difference = newValue - oldValue;
          monthlyGoal = isExpenseType(itemType)
            ? monthlyGoal - difference
            : monthlyGoal + difference;
        } else if (newValue < oldValue) {
          const difference = oldValue - newValue;
          monthlyGoal = isExpenseType(itemType)
            ? monthlyGoal + difference
            : monthlyGoal - difference;
        }
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, monthlyGoal);
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-month] error:", err);
    }
  }
}

// ---------------------- MULTI-PURPOSE ITEM HELPERS ----------------------
/**
 * Insert either a "history" or "recurring" item into the correct range,
 * making sure we:
 * 1) Validate fields
 * 2) Insert missing tags
 * 3) Convert date to MM/DD/YYYY if "history" item
 * 4) Append the row
 */
async function insertItem(
  sheets: any,
  data: any,
  itemType: "history" | "recurring"
) {
  // itemType affects which range, which columns, and which tags column (isRecurring).
  const isRecurring = itemType === "recurring";
  const range = isRecurring ? RECURRING_RANGE : HISTORY_RANGE;

  await addMissingTags(sheets, data.tags, isRecurring);

  // For History only: we need the date in MM/DD/YYYY.
  const dateFormatted = !isRecurring ? convertToMMDDYYYY(data.date) : "";
  const hyperlinkFormula = `=HYPERLINK("${data.editURL}", "Edit")`;

  // Build a row consistent with your original structure
  if (isRecurring) {
    // columns: type, category, tags, value, desc, editURL, hyperlink, id
    await appendDataToSheet(sheets, range, [
      [
        data.type,
        data.category,
        data.tags.join(", "),
        data.value,
        data.description || "",
        data.editURL,
        hyperlinkFormula,
        data.id,
      ],
    ]);
  } else {
    // columns: date, type, category, tags, value, desc, editURL, hyperlink, id, fy, fm, fw
    await appendDataToSheet(sheets, range, [
      [
        dateFormatted,
        data.type,
        data.category,
        data.tags.join(", "),
        data.value,
        data.description || "",
        data.editURL,
        hyperlinkFormula,
        data.id,
        data.fiscalYearId,
        data.fiscalMonthId,
        data.fiscalWeekId,
      ],
    ]);
  }
}

/**
 * Updates an existing "history" or "recurring" item in the correct row and columns.
 */
async function updateItem(
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

  // For history: existingId is in col 8, for recurring: col 7
  const idColIndex = isRecurring ? 7 : 8;
  const existingId = existingRow[idColIndex];
  if (!existingId) {
    throw new Error(`ID not found in the existing ${itemType} row.`);
  }

  // Insert new tags, if any
  await addMissingTags(sheets, data.tags, isRecurring);

  // Build our updated row
  const hyperlinkFormula = `=HYPERLINK("${existingRow[isRecurring ? 5 : 6]}", "Edit")`;

  if (isRecurring) {
    // columns: type, category, tags, value, desc, editURL, hyperlink, id
    const tagsStr = data.tags.join(", ");
    await updateSheetRow(sheets, rowRange, [
      [
        data.type,
        data.category,
        tagsStr,
        data.value,
        data.description,
        existingRow[5], // preserve existing editURL
        hyperlinkFormula,
        existingId,
      ],
    ]);
  } else {
    // columns: date, type, category, tags, value, desc, editURL, hyperlink, id
    const dateFormatted = convertToMMDDYYYY(data.date);
    const tagsStr = data.tags.join(", ");
    await updateSheetRow(sheets, rowRange, [
      [
        dateFormatted,
        data.type,
        data.category,
        tagsStr,
        data.value,
        data.description || "",
        existingRow[6], // preserve existing editURL
        hyperlinkFormula,
        existingId,
      ],
    ]);
  }

  return existingRow; // so we can compare originalValue, etc.
}

/**
 * Delete item from either the "history" or "recurring" table by ID.
 */
async function deleteItem(
  sheets: any,
  itemType: "history" | "recurring",
  id: string
) {
  // Step 1) Fetch the correct sheet ID
  const spreadsheetRes = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const tableName =
    itemType === "history" ? HISTORY_TABLE_NAME : RECURRING_TABLE_NAME;
  const tableSheet = spreadsheetRes.data.sheets?.find(
    (sh: any) => sh.properties?.title === tableName
  );
  if (!tableSheet || !tableSheet.properties?.sheetId) {
    throw new Error(`Failed to retrieve sheetId for ${tableName}.`);
  }

  // Step 2) Fetch all rows, find the ID
  const rangeAll = itemType === "history" ? HISTORY_RANGE : RECURRING_RANGE;
  const rowsAll = await getSheetData(sheets, rangeAll, false);
  rowsAll.shift(); // remove header
  // ID col is 8 for history, 7 for recurring
  const idColIndex = itemType === "history" ? 8 : 7;
  const rowIndex = findRowIndexById(rowsAll, id, idColIndex);
  if (rowIndex === -1) {
    throw new Error(`${itemType} item with ID ${id} not found.`);
  }
  // Google Sheets is 1-based, plus we removed header => +2
  const deleteRowIndex = rowIndex + 2;

  await deleteRow(
    sheets,
    SPREADSHEET_ID,
    tableSheet.properties.sheetId,
    deleteRowIndex
  );
}

// ---------------------- HANDLERS BY HTTP METHOD ----------------------

async function handleGET(sheets: any, req: Request, res: Response) {
  // 1) History
  const historyRows = await getSheetData(sheets, HISTORY_RANGE);
  const historyData = historyRows.map((row) => ({
    date: row[0],
    type: row[1],
    category: row[2],
    tags: row[3]
      ?.split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
    value: parseCellValue(row[4]),
    description: row[5],
    editURL: row[6] || "",
    id: row[8] || "",
    fiscalYearId: row[9],
    fiscalMonthId: row[10],
    fiscalWeekId: row[11],
    itemType: "history",
  }));

  // 2) Recurring
  const recurringRows = await getSheetData(sheets, RECURRING_RANGE);
  const recurringData = recurringRows.map((row) => ({
    type: row[0],
    category: row[1],
    tags: row[2]
      ?.split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
    value: parseCellValue(row[3]),
    description: row[4],
    editURL: row[5] || "",
    id: row[7] || "",
    itemType: "recurring",
  }));

  // 3) Categories & tags
  const listsAll = await getSheetData(sheets, METADATA_RANGE, false);
  const listsRows = listsAll.slice(1);
  const categories = listsRows.map((row) => row[0]).filter(Boolean);
  const nonRecurringTags = listsRows.map((row) => row[1]).filter(Boolean);
  const recurringTags = listsRows.map((row) => row[2]).filter(Boolean);

  // 4) Weekly & Monthly Goals
  const [wgResp, mgResp] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: WEEKLY_GOAL_RANGE,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: MONTHLY_GOAL_RANGE,
    }),
  ]);
  const weeklyGoalRaw = wgResp.data.values?.[0]?.[0] || "0";
  const monthlyGoalRaw = mgResp.data.values?.[0]?.[0] || "0";
  const weeklyGoal = parseFloat(weeklyGoalRaw.replace(/[^0-9.-]/g, ""));
  const monthlyGoal = parseFloat(monthlyGoalRaw.replace(/[^0-9.-]/g, ""));

  // 5) Fiscal Data (Weeks, Months, Years)
  // We already fetched them in fetchAndCacheFiscalData, but we also fetch them specifically
  // for local usage. Or we can reuse the cached data directly.
  let fiscalWeekData = (await getSheetData(sheets, FISCAL_WEEKS_RANGE)).map(
    (row) => ({
      id: row[0],
      number: row[1],
      start_date: row[2],
      end_date: row[3],
      year_title: row[4],
      month_id: row[5],
      itemType: "fiscalWeek",
    })
  );
  let fiscalMonthData = (await getSheetData(sheets, FISCAL_MONTHS_RANGE)).map(
    (row) => ({
      id: row[0],
      start_date: row[1],
      end_date: row[2],
      year_title: row[3],
      itemType: "fiscalMonth",
    })
  );
  let fiscalYearData = (await getSheetData(sheets, FISCAL_YEARS_RANGE)).map(
    (row) => ({
      id: row[0],
      title: row[1],
      start_date: row[2],
      end_date: row[3],
      itemType: "fiscalYear",
    })
  );

  // Filter +/- 365 days
  const parseDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const oneYearFromToday = new Date();
  oneYearFromToday.setDate(oneYearFromToday.getDate() + 365);
  const oneYearBeforeToday = new Date();
  oneYearBeforeToday.setDate(oneYearBeforeToday.getDate() - 365);

  const filterByStartDate = (data: any[]) =>
    data.filter((item) => {
      const startDate = parseDate(item.start_date);
      return (
        startDate &&
        startDate >= oneYearBeforeToday &&
        startDate <= oneYearFromToday
      );
    });

  fiscalWeekData = filterByStartDate(fiscalWeekData);
  fiscalMonthData = filterByStartDate(fiscalMonthData);
  fiscalYearData = filterByStartDate(fiscalYearData);

  const fiscalWeeksObj = convertArrayToObjectById(fiscalWeekData);
  const fiscalMonthsObj = convertArrayToObjectById(fiscalMonthData);
  const fiscalYearsObj = convertArrayToObjectById(fiscalYearData);

  res.status(200).json({
    history: historyData,
    recurring: recurringData,
    weeklyGoal,
    monthlyGoal,
    categories,
    nonRecurringTags,
    recurringTags,
    fiscalWeeks: fiscalWeeksObj,
    fiscalMonths: fiscalMonthsObj,
    fiscalYears: fiscalYearsObj,
  });
}

async function handlePOST(sheets: any, req: Request, res: Response) {
  const data = req.body;
  const itemType = data.itemType; // "history", "recurring", etc.

  if (itemType === "history") {
    if (
      !data.date ||
      !data.type ||
      typeof data.category !== "string" ||
      !Array.isArray(data.tags) ||
      typeof data.value !== "number" ||
      !data.id
    ) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    // Ensure valid fiscal
    const fiscalIDs = getFiscalIDs(
      data,
      cachedFiscalYears!,
      cachedFiscalMonths!,
      cachedFiscalWeeks!
    );
    if (!fiscalIDs) {
      res
        .status(400)
        .json({ error: "Invalid date or no matching fiscal period." });
      return;
    }
    // Merge them into data so insertItem can place them in columns
    Object.assign(data, fiscalIDs);

    // Insert the history item
    await insertItem(sheets, data, "history");
    res.status(200).json({ status: "success", id: data.id, fiscalIDs });
    return;
  }

  if (itemType === "recurring") {
    if (
      !data.type ||
      typeof data.category !== "string" ||
      !Array.isArray(data.tags) ||
      typeof data.value !== "number" ||
      !data.id
    ) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    await insertItem(sheets, data, "recurring");
    res.status(200).json({ status: "success", id: data.id });
    return;
  }

  res.status(400).json({ error: "Missing or invalid itemType" });
}

async function handlePUT(sheets: any, req: Request, res: Response) {
  const data = req.body;

  switch (data.itemType) {
    case "history": {
      if (
        !data.rowIndex ||
        !data.date ||
        !data.type ||
        typeof data.category !== "string" ||
        !Array.isArray(data.tags) ||
        typeof data.value !== "number" ||
        !data.id
      ) {
        res.status(400).json({ error: "Missing or invalid required fields" });
        return;
      }

      // 1) Update item
      const existingRow = await updateItem(sheets, data, "history");

      // 2) If value changed, adjust goals
      const rawOriginalValue = existingRow[4];
      const originalValue = parseCellValue(rawOriginalValue);
      if (data.value !== originalValue) {
        await adjustGoalIfSameFiscalPeriod(
          sheets,
          originalValue,
          data.value,
          data.type,
          data.fiscalWeekId,
          data.fiscalMonthId
        );
      }
      break;
    }

    case "recurring": {
      if (
        !data.rowIndex ||
        !data.type ||
        typeof data.category !== "string" ||
        !Array.isArray(data.tags) ||
        typeof data.value !== "number" ||
        !data.description ||
        !data.id
      ) {
        res.status(400).json({ error: "Missing or invalid required fields" });
        return;
      }
      await updateItem(sheets, data, "recurring");
      break;
    }

    case "weeklyGoal": {
      if (typeof data.value !== "number") {
        res.status(400).json({ error: "Missing or invalid goal" });
        return;
      }
      await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, data.value);
      break;
    }

    case "monthlyGoal": {
      if (typeof data.value !== "number") {
        res.status(400).json({ error: "Missing or invalid goal" });
        return;
      }
      await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, data.value);
      break;
    }

    default:
      res.status(400).json({ error: "Invalid or missing itemType" });
      return;
  }

  if (data.itemType === "history" || data.itemType === "recurring") {
    // We can retrieve the existing ID if we like, but we have it on `data.id`.
    res.status(200).json({ status: "success", id: data.id });
  } else {
    res.status(200).json({ status: "success" });
  }
}

async function handleDELETE(sheets: any, req: Request, res: Response) {
  const data = req.body;
  const id = data.id;
  if (!id) {
    res.status(400).json({ error: "Missing id field in request body." });
    return;
  }

  try {
    if (data.itemType === "history") {
      // 1) Delete from the History table
      await deleteItem(sheets, "history", id);

      // 2) If numeric value was provided, do goal adjustments
      if (typeof data.value !== "number") {
        res.status(400).json({ error: "Missing or invalid value" });
        return;
      }
      // same logic from your code
      try {
        const sameWeek = await isSameFiscalWeekById(data.fiscalWeekId, sheets);
        if (sameWeek) {
          const wgData = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: WEEKLY_GOAL_RANGE,
          });
          const rawWG = wgData.data.values?.[0]?.[0] || "0";
          let weeklyGoal = parseFloat(rawWG.replace(/[^0-9.-]/g, ""));
          weeklyGoal = isExpenseType(data.type)
            ? weeklyGoal + data.value
            : weeklyGoal - data.value;
          await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, weeklyGoal);
        }
      } catch (err) {
        console.error("Error adjusting weekly goal in DELETE:", err);
      }

      try {
        const sameMonth = await isSameFiscalMonthById(
          data.fiscalMonthId,
          sheets
        );
        if (sameMonth) {
          const mgData = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: MONTHLY_GOAL_RANGE,
          });
          const rawMG = mgData.data.values?.[0]?.[0] || "0";
          let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));
          monthlyGoal = isExpenseType(data.type)
            ? monthlyGoal + data.value
            : monthlyGoal - data.value;
          await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, monthlyGoal);
        }
      } catch (err) {
        console.error("Error adjusting monthly goal in DELETE:", err);
      }

      res.status(200).json({ status: "success", id });
    } else if (data.itemType === "recurring") {
      await deleteItem(sheets, "recurring", id);
      res.status(200).json({ status: "success", id });
    } else {
      res.status(400).json({ error: "Missing or invalid itemType" });
    }
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// ---------------------- MAIN CLOUD FUNCTION ----------------------

export const expenses = onRequest(
  {
    secrets: ["SERVICE_ACCOUNT_CLIENT_EMAIL", "SERVICE_ACCOUNT_PRIVATE_KEY"],
  },
  async (req: Request, res: Response) => {
    const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_CLIENT_EMAIL;
    const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error(
        "Service account credentials are not set in environment variables."
      );
    }

    const privateKey = SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
    const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
    const jwtClient = new google.auth.JWT(
      SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      SCOPES
    );
    const sheets = google.sheets({ version: "v4", auth: jwtClient });

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Ensure we have our cached fiscal data
      await fetchAndCacheFiscalData(sheets);

      switch (req.method) {
        case "GET":
          await handleGET(sheets, req, res);
          break;
        case "POST":
          await handlePOST(sheets, req, res);
          break;
        case "PUT":
          await handlePUT(sheets, req, res);
          break;
        case "DELETE":
          await handleDELETE(sheets, req, res);
          break;
        default:
          res.status(405).json({ error: "Method Not Allowed" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
