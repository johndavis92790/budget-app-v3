import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch");

admin.initializeApp();

const SECRET_TOKEN = "9a7ce018-5796-427d-8a67-3f204d4419af";

exports.sendNotification = functions.https.onRequest(
  async (req: any, res: any) => {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Verify secret token
    const token = req.headers["x-secret-token"];
    if (token !== SECRET_TOKEN) {
      return res.status(403).send("Forbidden");
    }

    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).send("Missing title or body");
    }

    try {
      // Retrieve all tokens from Firestore
      const tokensSnapshot = await admin
        .firestore()
        .collection("fcmTokens")
        .get();
      const tokens = tokensSnapshot.docs.map((doc: any) => doc.data().token);

      if (tokens.length === 0) {
        return res.status(200).send("No tokens found");
      }

      // Generate an OAuth 2.0 access token
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      });
      const accessToken = await auth.getAccessToken();

      // Prepare notification payload and send to each token
      const results = [];
      for (const token of tokens) {
        const message = {
          message: {
            token: token,
            data: {
              title: title,
              body: body,
              icon: "/favicon.ico",
            },
            android: {
              priority: "high",
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
            },
            webpush: {
              headers: {
                Urgency: "high",
              },
            },
          },
        };

        const response = await fetch(
          "https://fcm.googleapis.com/v1/projects/budget-app-v3/messages:send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(message),
          }
        );

        const responseData = await response.json();
        results.push({
          token,
          response: responseData,
          success: response.ok,
        });
      }

      // Log and return the results
      return res.status(200).send({
        success: true,
        results,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      return res.status(500).send(error);
    }
  }
);

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

const METADATA_RANGE = "Metadata!A1:B";

// ===== LOGS SHEET CONSTANTS (4 columns: Timestamp, Action, Data, Error) =====
const LOGS_TABLE_NAME = "Logs";
const LOGS_FIRST_COLUMN = "A";
const LOGS_LAST_COLUMN = "D";
const LOGS_RANGE = `${LOGS_TABLE_NAME}!${LOGS_FIRST_COLUMN}1:${LOGS_LAST_COLUMN}`;

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

let cachedFiscalYears: FiscalYear[] | null = null;
let cachedFiscalMonths: FiscalMonth[] | null = null;
let cachedFiscalWeeks: FiscalWeek[] | null = null;

/** Helper to get MST timestamp in format: 2025-01-03T14:05:06 */
function getMstTimestamp(): string {
  // 1) Convert local date/time to MST ("America/Denver")
  const dateInMst = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" })
  );
  // 2) Build a simple YYYY-MM-DDTHH:mm:ss string
  const year = dateInMst.getFullYear();
  const month = String(dateInMst.getMonth() + 1).padStart(2, "0");
  const day = String(dateInMst.getDate()).padStart(2, "0");
  const hh = String(dateInMst.getHours()).padStart(2, "0");
  const mm = String(dateInMst.getMinutes()).padStart(2, "0");
  const ss = String(dateInMst.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
}

/**
 * LOG ACTION HELPER
 * Appends a row to the Logs sheet with columns:
 * A = Timestamp (MST)
 * B = User Email
 * C = Action
 * D = Data (formatted JSON)
 * E = Error (formatted JSON if any)
 */
async function logAction(
  sheets: any,
  actionType: string,
  data: Record<string, any> = {},
  errorMessage?: string
) {
  // 1) Generate MST timestamp
  const timestamp = getMstTimestamp();

  // 2) Extract userEmail from the request body if available
  const userEmail = data.userEmail || "";

  // 3) Pretty-print data & error as multi-line JSON
  const dataStr =
    Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "";
  const errorStr = errorMessage ? JSON.stringify(errorMessage, null, 2) : "";

  // 4) Prepare the row for columns A-E
  const newRow = [timestamp, userEmail, actionType, dataStr, errorStr];

  // 5) Append it to the Logs sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: LOGS_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [newRow] },
  });
}

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

// Fetch and cache the fiscal data (years, months, weeks)
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
  // Get the current date
  const currentDate = new Date();
  
  // Find the current fiscal week by checking all weeks
  const allWeeks = await getSheetData(sheets, FISCAL_WEEKS_RANGE);
  let currentFiscalWeekId = null;
  
  for (const row of allWeeks) {
    const startDate = new Date(row[2]); // start_date is in column 3
    const endDate = new Date(row[3]);   // end_date is in column 4
    
    if (currentDate >= startDate && currentDate <= endDate) {
      currentFiscalWeekId = row[0]; // id is in column 1
      break;
    }
  }
  
  if (!currentFiscalWeekId) {
    console.error("Could not determine current fiscal week");
    return false;
  }
  
  // Compare the item's fiscal week ID with the current fiscal week ID
  return fiscalWeekId === currentFiscalWeekId;
}

async function isSameFiscalMonthById(fiscalMonthId: string, sheets: any) {
  // Get the current date
  const currentDate = new Date();
  
  // Find the current fiscal month by checking all months
  const allMonths = await getSheetData(sheets, FISCAL_MONTHS_RANGE);
  let currentFiscalMonthId = null;
  
  for (const row of allMonths) {
    const startDate = new Date(row[1]); // start_date is in column 2
    const endDate = new Date(row[2]);   // end_date is in column 3
    
    if (currentDate >= startDate && currentDate <= endDate) {
      currentFiscalMonthId = row[0]; // id is in column 1
      break;
    }
  }
  
  if (!currentFiscalMonthId) {
    console.error("Could not determine current fiscal month");
    return false;
  }
  
  // Compare the item's fiscal month ID with the current fiscal month ID
  return fiscalMonthId === currentFiscalMonthId;
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

async function addMissingTags(sheets: any, tags: string[]) {
  if (!tags || tags.length === 0) return;
  const listsRows = await getSheetData(sheets, METADATA_RANGE, false);
  const dataRows = listsRows.slice(1);
  const colIndex = 1;
  const existingTags = dataRows
    .map((row) => (row[colIndex] ? row[colIndex].trim() : ""))
    .filter(Boolean);

  const newTags = tags.filter((tag) => !existingTags.includes(tag));
  if (newTags.length === 0) return;

  const rowsToAppend = newTags.map((tag) => ["", tag]);
  await appendDataToSheet(sheets, METADATA_RANGE, rowsToAppend);
}

// Adjust goals if in the same fiscal period
async function adjustGoalIfSameFiscalPeriod(
  sheets: any,
  oldValue: number,
  data: any
) {
  if (data.fiscalWeekId) {
    try {
      const sameWeek = await isSameFiscalWeekById(data.fiscalWeekId, sheets);
      if (sameWeek) {
        const wgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: WEEKLY_GOAL_RANGE,
        });
        const rawWG = wgData.data.values?.[0]?.[0] || "0";
        let weeklyGoal = parseFloat(rawWG.replace(/[^0-9.-]/g, ""));
        let difference = 0;

        if (data.value > oldValue) {
          difference = data.value - oldValue;
          weeklyGoal = isExpenseType(data.type)
            ? weeklyGoal - difference
            : weeklyGoal + difference;
        } else if (data.value < oldValue) {
          difference = oldValue - data.value;
          weeklyGoal = isExpenseType(data.type)
            ? weeklyGoal + difference
            : weeklyGoal - difference;
        }
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, weeklyGoal);
        await logAction(sheets, "UPDATE_WEEKLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawWG.replace(/[^0-9.-]/g, "")),
          oldValue: oldValue,
          newValue: data.value,
          difference: difference,
          after: weeklyGoal,
        });
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-week] error:", err);
    }
  }

  if (data.fiscalMonthId) {
    try {
      const sameMonth = await isSameFiscalMonthById(data.fiscalMonthId, sheets);
      if (sameMonth) {
        const mgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMG = mgData.data.values?.[0]?.[0] || "0";
        let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));
        let difference = 0;

        if (data.value > oldValue) {
          difference = data.value - oldValue;
          monthlyGoal = isExpenseType(data.type)
            ? monthlyGoal - difference
            : monthlyGoal + difference;
        } else if (data.value < oldValue) {
          difference = oldValue - data.value;
          monthlyGoal = isExpenseType(data.type)
            ? monthlyGoal + difference
            : monthlyGoal - difference;
        }
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, monthlyGoal);
        await logAction(sheets, "UPDATE_MONTHLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawMG.replace(/[^0-9.-]/g, "")),
          oldValue: oldValue,
          newValue: data.value,
          difference: difference,
          after: monthlyGoal,
        });
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-month] error:", err);
    }
  }
}

// Adjust goals if in the same fiscal period
async function changeGoalIfSameFiscalPeriod(sheets: any, data: any) {
  if (data.fiscalWeekId) {
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
          ? weeklyGoal - data.value
          : weeklyGoal + data.value;
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, weeklyGoal);
        await logAction(sheets, "UPDATE_WEEKLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawWG.replace(/[^0-9.-]/g, "")),
          value: data.value,
          after: weeklyGoal,
        });
      }
    } catch (err) {
      console.error("[changeGoalIfSameFiscalPeriod-week] error:", err);
    }
  }

  if (data.fiscalMonthId) {
    try {
      const sameMonth = await isSameFiscalMonthById(data.fiscalMonthId, sheets);
      if (sameMonth) {
        const mgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMG = mgData.data.values?.[0]?.[0] || "0";
        let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));
        monthlyGoal = isExpenseType(data.type)
          ? monthlyGoal - data.value
          : monthlyGoal + data.value;
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, monthlyGoal);
        await logAction(sheets, "UPDATE_MONTHLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawMG.replace(/[^0-9.-]/g, "")),
          value: data.value,
          after: monthlyGoal,
        });
      }
    } catch (err) {
      console.error("[changeGoalIfSameFiscalPeriod-month] error:", err);
    }
  }
}

// Insert either a History or Recurring item
async function insertItem(
  sheets: any,
  data: any,
  itemType: "history" | "recurring"
) {
  const isRecurring = itemType === "recurring";
  const range = isRecurring ? RECURRING_RANGE : HISTORY_RANGE;

  await addMissingTags(sheets, data.tags);
  const dateFormatted = !isRecurring ? convertToMMDDYYYY(data.date) : "";
  const hyperlinkFormula = `=HYPERLINK("${data.editURL}", "Edit")`;

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

// Update a History or Recurring item
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

  // For history: ID is col 8; recurring: col 7
  const idColIndex = isRecurring ? 7 : 8;
  const existingId = existingRow[idColIndex];
  if (!existingId) {
    throw new Error(`ID not found in the existing ${itemType} row.`);
  }

  await addMissingTags(sheets, data.tags);
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
        existingRow[5],
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
        existingRow[6],
        hyperlinkFormula,
        existingId,
      ],
    ]);
  }

  return existingRow;
}

// Delete a History or Recurring item by ID
async function deleteItem(
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
    (sh: any) => sh.properties?.title === tableName
  );
  if (!tableSheet || !tableSheet.properties?.sheetId) {
    throw new Error(`Failed to retrieve sheetId for ${tableName}.`);
  }

  const rangeAll = itemType === "history" ? HISTORY_RANGE : RECURRING_RANGE;
  const rowsAll = await getSheetData(sheets, rangeAll, false);
  rowsAll.shift(); // remove header row

  // ID col is 8 for history, 7 for recurring
  const idColIndex = itemType === "history" ? 8 : 7;
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
    deleteRowIndex
  );
}

// -------------------------------------
// Handlers for each HTTP method
// -------------------------------------

async function handleGET(sheets: any, req: Request, res: Response) {
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

  const listsAll = await getSheetData(sheets, METADATA_RANGE, false);
  const listsRows = listsAll.slice(1);
  const categories = listsRows.map((row) => row[0]).filter(Boolean);
  const tags = listsRows.map((row) => row[1]).filter(Boolean);

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

  // Filter to only ±1 year from today
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
    tags,
    fiscalWeeks: fiscalWeeksObj,
    fiscalMonths: fiscalMonthsObj,
    fiscalYears: fiscalYearsObj,
  });
}

async function handlePOST(sheets: any, req: Request, res: Response) {
  const data = req.body;
  const itemType = data.itemType; // "history" or "recurring"

  try {
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
      Object.assign(data, fiscalIDs);

      await insertItem(sheets, data, "history");
      await logAction(sheets, "ADD_HISTORY", data);

      await changeGoalIfSameFiscalPeriod(sheets, data);

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
      await logAction(sheets, "ADD_RECURRING", data);
      res.status(200).json({ status: "success", id: data.id });
      return;
    }

    res.status(400).json({ error: "Missing or invalid itemType" });
  } catch (err: any) {
    console.error("Error in handlePOST:", err);
    await logAction(sheets, "POST_ERROR", {}, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function handlePUT(sheets: any, req: Request, res: Response) {
  const data = req.body;
  try {
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

        const existingRow = await updateItem(sheets, data, "history");
        const rawOriginalValue = existingRow[4];
        const originalValue = parseCellValue(rawOriginalValue);
        if (data.value !== originalValue) {
          await adjustGoalIfSameFiscalPeriod(sheets, originalValue, data);
        }

        await logAction(sheets, "UPDATE_HISTORY", data);
        res.status(200).json({ status: "success", id: data.id });
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
        await logAction(sheets, "UPDATE_RECURRING", data);
        res.status(200).json({ status: "success", id: data.id });
        break;
      }

      case "weeklyGoal": {
        if (typeof data.value !== "number") {
          res.status(400).json({ error: "Missing or invalid goal" });
          return;
        }
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, data.value);
        await logAction(sheets, "UPDATE_WEEKLY_GOAL", data);
        res.status(200).json({ status: "success" });
        break;
      }

      case "monthlyGoal": {
        if (typeof data.value !== "number") {
          res.status(400).json({ error: "Missing or invalid goal" });
          return;
        }
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, data.value);
        await logAction(sheets, "UPDATE_MONTHLY_GOAL", data);
        res.status(200).json({ status: "success" });
        break;
      }

      default:
        res.status(400).json({ error: "Invalid or missing itemType" });
        return;
    }
  } catch (err: any) {
    console.error("Error in handlePUT:", err);
    await logAction(sheets, "PUT_ERROR", data, err.message);
    res.status(500).json({ error: "Internal Server Error" });
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
      await deleteItem(sheets, "history", id);

      if (typeof data.value !== "number") {
        res.status(400).json({ error: "Missing or invalid value" });
        return;
      }

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
          await logAction(sheets, "UPDATE_WEEKLY_GOAL", {
            itemType: data.itemType,
            type: data.type,
            userEmail: data.userEmail,
            before: parseFloat(rawWG.replace(/[^0-9.-]/g, "")),
            value: data.value,
            after: weeklyGoal,
          });
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
          await logAction(sheets, "UPDATE_MONTHLY_GOAL", {
            itemType: data.itemType,
            type: data.type,
            userEmail: data.userEmail,
            before: parseFloat(rawMG.replace(/[^0-9.-]/g, "")),
            value: data.value,
            after: monthlyGoal,
          });
        }
      } catch (err) {
        console.error("Error adjusting monthly goal in DELETE:", err);
      }

      await logAction(sheets, "DELETE_HISTORY", data);
      res.status(200).json({ status: "success", id });
    } else if (data.itemType === "recurring") {
      await deleteItem(sheets, "recurring", id);
      await logAction(sheets, "DELETE_RECURRING", data);
      res.status(200).json({ status: "success", id });
    } else {
      res.status(400).json({ error: "Missing or invalid itemType" });
    }
  } catch (error: any) {
    console.error("Error in handleDELETE:", error);
    await logAction(sheets, "DELETE_ERROR", data, error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// -------------------------------------
// MAIN Cloud Function
// -------------------------------------

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

    // Convert escaped newlines in the private key
    const privateKey = SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
    const SCOPES = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/firebase.messaging",
    ];
    const jwtClient = new google.auth.JWT(
      SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      SCOPES
    );
    const sheets = google.sheets({ version: "v4", auth: jwtClient });

    // CORS settings
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Ensure we have cached fiscal data
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
    } catch (error: any) {
      console.error("Top-level error:", error);
      // Log major top-level errors as well
      await logAction(sheets, "TOP_LEVEL_ERROR", {}, error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
