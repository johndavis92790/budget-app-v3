import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";
// const FRONTEND_URL = "https://budget-app-v3.web.app";
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

// Interfaces
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

// Global variables to cache fiscal data
let cachedFiscalYears: FiscalYear[] | null = null;
let cachedFiscalMonths: FiscalMonth[] | null = null;
let cachedFiscalWeeks: FiscalWeek[] | null = null;

/**
 * Fetches and caches fiscal data if not already cached.
 *
 * @param {google.sheets_v4.Sheets} sheets - The Google Sheets API client.
 * @returns {Promise<void>}
 */
async function fetchAndCacheFiscalData(sheets: any): Promise<void> {
  if (cachedFiscalYears && cachedFiscalMonths && cachedFiscalWeeks) {
    // Data already cached
    return;
  }

  // Fetch Fiscal Years
  const fiscalYearRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: FISCAL_YEARS_RANGE,
  });

  const fiscalYearRows = fiscalYearRes.data.values || [];
  fiscalYearRows.shift(); // Remove headers row

  cachedFiscalYears = fiscalYearRows.map((row: any) => ({
    id: row[0],
    title: row[1],
    start_date: row[2],
    end_date: row[3],
    itemType: "fiscalYear",
  }));

  // Fetch Fiscal Months
  const fiscalMonthRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: FISCAL_MONTHS_RANGE,
  });

  const fiscalMonthRows = fiscalMonthRes.data.values || [];
  fiscalMonthRows.shift(); // Remove headers row

  cachedFiscalMonths = fiscalMonthRows.map((row: any) => ({
    id: row[0],
    start_date: row[1],
    end_date: row[2],
    year_title: row[3],
    itemType: "fiscalMonth",
  }));

  // Fetch Fiscal Weeks
  const fiscalWeekRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: FISCAL_WEEKS_RANGE,
  });

  const fiscalWeekRows = fiscalWeekRes.data.values || [];
  fiscalWeekRows.shift(); // Remove headers row

  cachedFiscalWeeks = fiscalWeekRows.map((row: any) => ({
    id: row[0],
    number: row[1],
    start_date: row[2],
    end_date: row[3],
    year_title: row[4],
    month_id: row[5],
    itemType: "fiscalWeek",
  }));
}

/**
 * Determines if a given fiscal week ID matches the current date's fiscal week ID.
 *
 * @param {string} fiscalWeekId - The fiscal week ID to check.
 * @param {google.sheets_v4.Sheets} sheets - The Google Sheets API client.
 * @returns {Promise<boolean>} - True if the given fiscal week ID matches the current date's fiscal week ID.
 */
async function isSameFiscalWeekById(
  fiscalWeekId: string,
  sheets: any
): Promise<boolean> {
  try {
    // Fetch Fiscal Weeks data
    const { data: { values: fiscalWeekRows = [] } = {} } =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: FISCAL_WEEKS_RANGE,
      });

    if (fiscalWeekRows.length <= 1) {
      throw new Error("No fiscal week data available.");
    }

    // Remove headers row
    const dataRows = fiscalWeekRows.slice(1);

    // Find the row matching the given fiscal week ID
    const matchingRow = dataRows.find((row: any) => fiscalWeekId === row[0]);

    if (!matchingRow) {
      throw new Error("No matching fiscal week found for the provided ID.");
    }

    // Return true if the given fiscal week ID matches the found row's fiscal week ID
    return fiscalWeekId === matchingRow[0];
  } catch (error) {
    console.error("Error in isSameFiscalWeekById:", error);
    throw error;
  }
}

/**
 * Determines if a given fiscal month ID matches the current date's fiscal month ID.
 *
 * @param {string} fiscalMonthId - The fiscal month ID to check.
 * @param {google.sheets_v4.Sheets} sheets - The Google Sheets API client.
 * @returns {Promise<boolean>} - True if the given fiscal month ID matches the current date's fiscal month ID.
 */
async function isSameFiscalMonthById(
  fiscalMonthId: string,
  sheets: any
): Promise<boolean> {
  try {
    // Fetch Fiscal Months data
    const { data: { values: fiscalMonthRows = [] } = {} } =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: FISCAL_MONTHS_RANGE,
      });

    if (fiscalMonthRows.length <= 1) {
      throw new Error("No fiscal month data available.");
    }

    // Remove headers row
    const dataRows = fiscalMonthRows.slice(1);

    // Find the row matching the given fiscal month ID
    const matchingRow = dataRows.find((row: any) => fiscalMonthId === row[0]);

    if (!matchingRow) {
      throw new Error("No matching fiscal month found for the provided ID.");
    }

    // Return true if the given fiscal month ID matches the found row's fiscal month ID
    return fiscalMonthId === matchingRow[0];
  } catch (error) {
    console.error("Error in isSameFiscalMonthById:", error);
    throw error;
  }
}

/**
 * Calculates the associated fiscal year, month, and week IDs for a given date.
 *
 * @param {IncomingObject} item - The incoming object containing the date.
 * @param {FiscalYear[]} fiscalYears - Array of fiscal year data.
 * @param {FiscalMonth[]} fiscalMonths - Array of fiscal month data.
 * @param {FiscalWeek[]} fiscalWeeks - Array of fiscal week data.
 * @returns {{
 *   fiscalYearId: string;
 *   fiscalMonthId: string;
 *   fiscalWeekId: string;
 * } | null} - An object containing the fiscal IDs or null if not found.
 */
function getFiscalIDs(
  item: IncomingObject,
  fiscalYears: FiscalYear[],
  fiscalMonths: FiscalMonth[],
  fiscalWeeks: FiscalWeek[]
): {
  fiscalYearId: string;
  fiscalMonthId: string;
  fiscalWeekId: string;
} | null {
  const { date: dateStr } = item;

  // Helper function to parse date strings to Date objects
  const parseDate = (dateStr: string): Date | null => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const date = parseDate(dateStr);
  if (!date) {
    console.error(`Invalid date format: ${dateStr}`);
    return null;
  }

  // Find Fiscal Year
  const fiscalYear = fiscalYears.find((year) => {
    const start = new Date(year.start_date);
    const end = new Date(year.end_date);
    return date >= start && date <= end;
  });

  if (!fiscalYear) {
    console.error(`No Fiscal Year found for date: ${dateStr}`);
    return null;
  }

  // Find Fiscal Month within the found Fiscal Year
  const fiscalMonth = fiscalMonths.find((month) => {
    if (month.year_title !== fiscalYear.title) return false;
    const start = new Date(month.start_date);
    const end = new Date(month.end_date);
    return date >= start && date <= end;
  });

  if (!fiscalMonth) {
    console.error(
      `No Fiscal Month found for date: ${dateStr} within Fiscal Year: ${fiscalYear.title}`
    );
    return null;
  }

  // Find Fiscal Week within the found Fiscal Month and Fiscal Year
  const fiscalWeek = fiscalWeeks.find((week) => {
    if (week.year_title !== fiscalYear.title) return false;
    if (week.month_id !== fiscalMonth.id) return false;
    const start = new Date(week.start_date);
    const end = new Date(week.end_date);
    return date >= start && date <= end;
  });

  if (!fiscalWeek) {
    console.error(
      `No Fiscal Week found for date: ${dateStr} within Fiscal Year: ${fiscalYear.title} and Fiscal Month ID: ${fiscalMonth.id}`
    );
    return null;
  }

  return {
    fiscalYearId: fiscalYear.id,
    fiscalMonthId: fiscalMonth.id,
    fiscalWeekId: fiscalWeek.id,
  };
}

/**
 * Converts an array of objects to an object indexed by the 'id' property.
 *
 * @param {any[]} arr - The array to convert.
 * @returns {Record<string, any>} - The resulting object.
 */
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
      // Fetch and cache fiscal data
      await fetchAndCacheFiscalData(sheets);

      //-------------------------GET----------------------------------------------------
      if (req.method === "GET") {
        // Get history
        const historyRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: HISTORY_RANGE,
        });

        const historyRows = historyRes.data.values || [];
        historyRows.shift(); // Remove headers row

        // Indices: A=0,B=1,C=2,D=3,E=4,F=5,G=6,H=7,I=8,J=9,K=10,L=11

        const historyData = historyRows.map((row, index) => {
          const rawValue = row[4];
          const value = rawValue
            ? parseFloat(rawValue.replace(/[^0-9.-]/g, ""))
            : 0;

          return {
            date: row[0],
            type: row[1],
            category: row[2],
            tags: row[3]
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
            value,
            description: row[5],
            editURL: row[6] || "",
            id: row[8] || "",
            fiscalYearId: row[9],
            fiscalMonthId: row[10],
            fiscalWeekId: row[11],
            itemType: "history",
          };
        });

        // Get recurring
        const recurringRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: RECURRING_RANGE,
        });

        const recurringRows = recurringRes.data.values || [];
        recurringRows.shift(); // Remove headers row

        // Indices: A=0,B=1,C=2,D=3,E=4,F=5,G=6

        const recurringData = recurringRows.map((row, index) => {
          const rawValue = row[3];
          const value = rawValue
            ? parseFloat(rawValue.replace(/[^0-9.-]/g, ""))
            : 0;

          return {
            type: row[0],
            category: row[1],
            tags: row[2]
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
            value,
            description: row[4],
            editURL: row[5] || "",
            id: row[7] || "",
            itemType: "recurring",
          };
        });

        // Get categories & tags lists
        const listsRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: METADATA_RANGE,
        });

        const listsRows = listsRes.data.values || [];
        listsRows.shift(); // Remove headers
        const categories = listsRows.map((row) => row[0]).filter(Boolean);
        const nonRecurringTags = listsRows.map((row) => row[1]).filter(Boolean);
        const recurringTags = listsRows.map((row) => row[2]).filter(Boolean);

        // Get current weekly goal
        const currentWeeklyGoalRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: WEEKLY_GOAL_RANGE,
        });
        const rawWeeklyGoal =
          currentWeeklyGoalRes.data.values?.[0]?.[0] || null;
        const cleanedWeeklyGoal = rawWeeklyGoal
          ? rawWeeklyGoal.replace(/[^0-9.-]/g, "")
          : "0";
        const weeklyGoal = parseFloat(cleanedWeeklyGoal);

        // Get current monthly goal
        const currentMonthlyGoalRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMonthlyGoal =
          currentMonthlyGoalRes.data.values?.[0]?.[0] || null;
        const cleanedMonthlyGoal = rawMonthlyGoal
          ? rawMonthlyGoal.replace(/[^0-9.-]/g, "")
          : "0";
        const monthlyGoal = parseFloat(cleanedMonthlyGoal);

        // Get Fiscal Weeks
        const fiscalWeekRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: FISCAL_WEEKS_RANGE,
        });

        const fiscalWeekRows = fiscalWeekRes.data.values || [];
        fiscalWeekRows.shift(); // Remove headers row

        let fiscalWeekData = fiscalWeekRows.map((row, index) => {
          return {
            id: row[0],
            number: row[1],
            start_date: row[2],
            end_date: row[3],
            year_title: row[4],
            month_id: row[5],
            itemType: "fiscalWeek",
          };
        });

        // Get Fiscal Months
        const fiscalMonthRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: FISCAL_MONTHS_RANGE,
        });

        const fiscalMonthRows = fiscalMonthRes.data.values || [];
        fiscalMonthRows.shift(); // Remove headers row

        let fiscalMonthData = fiscalMonthRows.map((row, index) => {
          return {
            id: row[0],
            start_date: row[1],
            end_date: row[2],
            year_title: row[3],
            itemType: "fiscalMonth",
          };
        });

        // Get Fiscal Years
        const fiscalYearRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: FISCAL_YEARS_RANGE,
        });

        const fiscalYearRows = fiscalYearRes.data.values || [];
        fiscalYearRows.shift(); // Remove headers row

        let fiscalYearData = fiscalYearRows.map((row, index) => {
          return {
            id: row[0],
            title: row[1],
            start_date: row[2],
            end_date: row[3],
            itemType: "fiscalYear",
          };
        });

        // ----------------- Filtering Fiscal Data -----------------

        // Helper function to parse date strings to Date objects
        const parseDate = (dateStr: string): Date | null => {
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        };

        // Get today's date and the date 365 days from now
        const oneYearFromToday = new Date();
        oneYearFromToday.setDate(oneYearFromToday.getDate() + 365);

        // Get today's date and the date 365 days before now
        const oneYearBeforeToday = new Date();
        oneYearBeforeToday.setDate(oneYearBeforeToday.getDate() + 365);

        // Function to filter data based on start_date
        const filterByStartDate = (data: any[]) => {
          return data.filter((item) => {
            const startDate = parseDate(item.start_date);
            if (!startDate) return false; // Exclude if date is invalid
            return (
              startDate >= oneYearBeforeToday && startDate <= oneYearFromToday
            );
          });
        };

        // Apply filtering
        fiscalWeekData = filterByStartDate(fiscalWeekData);
        fiscalMonthData = filterByStartDate(fiscalMonthData);
        fiscalYearData = filterByStartDate(fiscalYearData);

        // ----------------- End of Filtering -----------------

        // Convert Fiscal Data Arrays to Objects Indexed by ID
        const fiscalYearsObj = convertArrayToObjectById(fiscalYearData);
        const fiscalMonthsObj = convertArrayToObjectById(fiscalMonthData);
        const fiscalWeeksObj = convertArrayToObjectById(fiscalWeekData);

        res.status(200).json({
          history: historyData,
          recurring: recurringData,
          weeklyGoal,
          monthlyGoal,
          categories,
          nonRecurringTags,
          recurringTags,
          fiscalWeeks: fiscalWeeksObj, // Updated to object
          fiscalMonths: fiscalMonthsObj, // Updated to object
          fiscalYears: fiscalYearsObj, // Updated to object
        });
        return;
        //-------------------------POST----------------------------------------------------
      } else if (req.method === "POST") {
        const data = req.body;

        const id = data.id; // This is the numeric ID from the frontend
        const hyperlinkFormula = `=HYPERLINK("${data.editURL}", "Edit")`;

        if (data.itemType === "history") {
          if (
            !data.date ||
            !data.type ||
            typeof data.category !== "string" ||
            !Array.isArray(data.tags) ||
            typeof data.value !== "number" ||
            !data.id ||
            !data.itemType
          ) {
            res
              .status(400)
              .json({ error: "Missing or invalid required fields" });
            return;
          }

          // Calculate Fiscal IDs
          const fiscalIDs = getFiscalIDs(
            data,
            cachedFiscalYears!,
            cachedFiscalMonths!,
            cachedFiscalWeeks!
          );

          if (!fiscalIDs) {
            res
              .status(400)
              .json({ error: "Invalid date or fiscal period not found." });
            return;
          }

          const dateFormatted = convertToMMDDYYYY(data.date);

          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: HISTORY_RANGE,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [
                [
                  dateFormatted, // A=date
                  data.type, // B=type
                  data.category, // C=category
                  data.tags.join(", "), // D=tags
                  data.value, // E=value
                  data.description || "", // F=description
                  data.editURL, // G=editLink
                  hyperlinkFormula, // H=hyperlink
                  id, // I=id (no prefix, just the numeric string)
                  fiscalIDs.fiscalYearId, // J=fiscalYearId
                  fiscalIDs.fiscalMonthId, // K=fiscalMonthId
                  fiscalIDs.fiscalWeekId, // L=fiscalWeekId
                ],
              ],
            },
          });

          res.status(200).json({ status: "success", id: id, fiscalIDs });
          return;
        } else if (data.itemType === "recurring") {
          if (
            !data.type ||
            typeof data.category !== "string" ||
            !Array.isArray(data.tags) ||
            typeof data.value !== "number" ||
            !data.id ||
            !data.itemType
          ) {
            res
              .status(400)
              .json({ error: "Missing or invalid required fields" });
            return;
          }

          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: RECURRING_RANGE,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [
                [
                  data.type, // A=type
                  data.category, // B=category
                  data.tags.join(", "), // C=tags
                  data.value, // D=value
                  data.description || "", // E=description
                  data.editURL, // F=editLink
                  hyperlinkFormula, // G=hyperlink
                  id, // H=id (no prefix, just the numeric string)
                ],
              ],
            },
          });

          res.status(200).json({ status: "success", id: id });
          return;
        } else {
          res.status(400).json({ error: "Missing or invalid itemType" });
          return;
        }
        //-------------------------PUT----------------------------------------------------
      } else if (req.method === "PUT") {
        const data = req.body;
        let existingId: string | undefined; // We'll only set this if itemType is history or recurring

        switch (data.itemType) {
          case "history": {
            const dateFormatted = convertToMMDDYYYY(data.date);

            if (
              !data.rowIndex ||
              !data.date ||
              !data.type ||
              typeof data.category !== "string" ||
              !Array.isArray(data.tags) ||
              typeof data.value !== "number" ||
              !data.id
            ) {
              res
                .status(400)
                .json({ error: "Missing or invalid required fields" });
              return;
            }

            const tagsStr = data.tags.join(", ");
            const rowIndex = data.rowIndex;

            // Fetch existing row to get its ID
            const rowRange = `${HISTORY_TABLE_NAME}!${HISTORY_FIRST_COLUMN}${rowIndex}:${HISTORY_LAST_COLUMN}${rowIndex}`;
            const existingRowRes = await sheets.spreadsheets.values.get({
              spreadsheetId: SPREADSHEET_ID,
              range: rowRange,
            });

            const existingRow =
              existingRowRes.data.values && existingRowRes.data.values[0];
            if (!existingRow) {
              res.status(404).json({ error: "History not found" });
              return;
            }

            existingId = existingRow[8]; // column I for id
            const existingEditURL = existingRow[6]; // column G for editURL
            if (!existingId) {
              res
                .status(500)
                .json({ error: "ID not found in the existing history row" });
              return;
            }

            const hyperlinkFormula = `=HYPERLINK("${existingEditURL}", "Edit")`;

            const rawOriginalValue = existingRow[4];
            const cleanedOriginalValue = rawOriginalValue
              ? rawOriginalValue.replace(/[^0-9.-]/g, "")
              : "0";
            let originalValue = parseFloat(cleanedOriginalValue);

            if (data.value !== originalValue) {
              const isSamefiscalWeek = await isSameFiscalWeekById(
                data.fiscalWeekId,
                sheets
              );
              if (isSamefiscalWeek) {
                const currentWeeklyGoalRes =
                  await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: WEEKLY_GOAL_RANGE,
                  });
                const rawWeeklyGoal =
                  currentWeeklyGoalRes.data.values?.[0]?.[0] || null;
                const cleanedWeeklyGoal = rawWeeklyGoal
                  ? rawWeeklyGoal.replace(/[^0-9.-]/g, "")
                  : "0";
                let weeklyGoal = parseFloat(cleanedWeeklyGoal);

                let difference = 0;
                if (data.value > originalValue) {
                  difference = data.value - originalValue;
                  if (
                    data.type === "Expense" ||
                    data.type === "Recurring Expense"
                  ) {
                    weeklyGoal = weeklyGoal - difference;
                  } else {
                    weeklyGoal = weeklyGoal + difference;
                  }
                } else if (data.value < originalValue) {
                  difference = originalValue - data.value;
                  if (
                    data.type === "Expense" ||
                    data.type === "Recurring Expense"
                  ) {
                    weeklyGoal = weeklyGoal + difference;
                  } else {
                    weeklyGoal = weeklyGoal - difference;
                  }
                }

                await sheets.spreadsheets.values.update({
                  spreadsheetId: SPREADSHEET_ID,
                  range: WEEKLY_GOAL_RANGE,
                  valueInputOption: "USER_ENTERED",
                  requestBody: {
                    values: [[weeklyGoal]],
                  },
                });
              }
              const isSamefiscalMonth = await isSameFiscalMonthById(
                data.fiscalMonthId,
                sheets
              );
              if (isSamefiscalMonth) {
                // Get and update current monthly goal
                const currentMonthlyGoalRes =
                  await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: MONTHLY_GOAL_RANGE,
                  });
                const rawMonthlyGoal =
                  currentMonthlyGoalRes.data.values?.[0]?.[0] || null;
                const cleanedMonthlyGoal = rawMonthlyGoal
                  ? rawMonthlyGoal.replace(/[^0-9.-]/g, "")
                  : "0";
                let monthlyGoal = parseFloat(cleanedMonthlyGoal);

                let difference = 0;
                if (data.value > originalValue) {
                  difference = data.value - originalValue;
                  if (
                    data.type === "Expense" ||
                    data.type === "Recurring Expense"
                  ) {
                    monthlyGoal = monthlyGoal - difference
                  } else {
                    monthlyGoal = monthlyGoal + difference
                  }
                } else if (data.value < originalValue) {
                  difference = originalValue - data.value;
                  if (
                    data.type === "Expense" ||
                    data.type === "Recurring Expense"
                  ) {
                    monthlyGoal = monthlyGoal + difference;
                  } else {
                    monthlyGoal = monthlyGoal - difference;
                  }
                }

                await sheets.spreadsheets.values.update({
                  spreadsheetId: SPREADSHEET_ID,
                  range: MONTHLY_GOAL_RANGE,
                  valueInputOption: "USER_ENTERED",
                  requestBody: {
                    values: [[monthlyGoal]],
                  },
                });
              }
            }

            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: rowRange,
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [
                  [
                    dateFormatted,
                    data.type,
                    data.category,
                    tagsStr,
                    data.value,
                    data.description || "",
                    existingEditURL,
                    hyperlinkFormula,
                    existingId, // Preserve the same numeric ID
                  ],
                ],
              },
            });

            break; // end case "history"
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
              res
                .status(400)
                .json({ error: "Missing or invalid required fields" });
              return;
            }

            const tagsStr = data.tags.join(", ");
            const rowIndex = data.rowIndex;

            // Fetch existing row to get its ID
            const rowRange = `${RECURRING_TABLE_NAME}!${RECURRING_FIRST_COLUMN}${rowIndex}:${RECURRING_LAST_COLUMN}${rowIndex}`;
            const existingRowRes = await sheets.spreadsheets.values.get({
              spreadsheetId: SPREADSHEET_ID,
              range: rowRange,
            });

            const existingRow =
              existingRowRes.data.values && existingRowRes.data.values[0];
            if (!existingRow) {
              res.status(404).json({ error: "Recurring not found" });
              return;
            }

            existingId = existingRow[7]; // column H for id
            const existingEditURL = existingRow[5]; // column F for editURL
            if (!existingId) {
              res
                .status(500)
                .json({ error: "ID not found in the existing recurring row" });
              return;
            }

            const hyperlinkFormula = `=HYPERLINK("${existingEditURL}", "Edit")`;

            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: rowRange,
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [
                  [
                    data.type,
                    data.category,
                    tagsStr,
                    data.value,
                    data.description,
                    existingEditURL,
                    hyperlinkFormula,
                    existingId, // Preserve the same numeric ID
                  ],
                ],
              },
            });

            break; // end case "recurring"
          }

          case "weeklyGoal": {
            if (typeof data.value !== "number") {
              res.status(400).json({ error: "Missing or invalid goal" });
              return;
            }
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: WEEKLY_GOAL_RANGE,
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [[data.value]],
              },
            });
            break; // end case "weeklyGoal"
          }

          case "monthlyGoal": {
            if (typeof data.value !== "number") {
              res.status(400).json({ error: "Missing or invalid goal" });
              return;
            }
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: MONTHLY_GOAL_RANGE,
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [[data.value]],
              },
            });
            break; // end case "monthlyGoal"
          }

          default: {
            res.status(400).json({ error: "Invalid or missing itemType" });
            return;
          }
        } // end switch

        // If we updated a history or recurring item, we have an existingId.
        // For weeklyGoal or monthlyGoal, we don't have an ID to return.
        if (data.itemType === "history" || data.itemType === "recurring") {
          res.status(200).json({ status: "success", id: existingId });
        } else {
          res.status(200).json({ status: "success" });
        }
        return;
        //-------------------------DELETE----------------------------------------------------
      } else if (req.method === "DELETE") {
        const data = req.body;
        console.log(data);
        const id = data.id;

        if (!id) {
          res.status(400).json({ error: "Missing id field in request body." });
          return;
        }

        if (data.itemType === "history") {
          try {
            // Get spreadsheet metadata to retrieve the sheetId
            const spreadsheetRes = await sheets.spreadsheets.get({
              spreadsheetId: SPREADSHEET_ID,
            });

            const sheet = spreadsheetRes.data.sheets?.find(
              (sheet) => sheet.properties?.title === HISTORY_TABLE_NAME
            );

            if (!sheet || !sheet.properties?.sheetId) {
              res.status(500).json({
                error: "Failed to retrieve sheetId for History table.",
              });
              return;
            }

            const sheetId = sheet.properties.sheetId;

            // Get all rows from the History table
            const historyRes = await sheets.spreadsheets.values.get({
              spreadsheetId: SPREADSHEET_ID,
              range: HISTORY_RANGE,
            });

            const historyRows = historyRes.data.values || [];
            historyRows.shift(); // Remove the header row without assigning it to a variable

            // Find the row index of the row with the matching ID
            const rowIndex = historyRows.findIndex((row) => {
              return row[8] === id;
            });

            if (rowIndex === -1) {
              res.status(404).json({
                error: "History item with the specified ID not found.",
              });
              return;
            }

            // Google Sheets uses 1-based indexing, and the header row is row 1
            const deleteRowIndex = rowIndex + 2; // Account for header row and 1-based index

            // Delete the row
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              requestBody: {
                requests: [
                  {
                    deleteDimension: {
                      range: {
                        sheetId, // Pass the valid sheetId
                        dimension: "ROWS",
                        startIndex: deleteRowIndex - 1, // Convert back to 0-based index
                        endIndex: deleteRowIndex, // Only delete one row
                      },
                    },
                  },
                ],
              },
            });

            if (typeof data.value !== "number") {
              res.status(400).json({ error: "Missing or invalid value" });
              return;
            }

            const isSamefiscalWeek = await isSameFiscalWeekById(
              data.fiscalWeekId,
              sheets
            );

            if (isSamefiscalWeek) {
              // Get and update current weekly goal
              const currentWeeklyGoalRes = await sheets.spreadsheets.values.get(
                {
                  spreadsheetId: SPREADSHEET_ID,
                  range: WEEKLY_GOAL_RANGE,
                }
              );
              const rawWeeklyGoal =
                currentWeeklyGoalRes.data.values?.[0]?.[0] || null;
              const cleanedWeeklyGoal = rawWeeklyGoal
                ? rawWeeklyGoal.replace(/[^0-9.-]/g, "")
                : "0";
              let weeklyGoal = parseFloat(cleanedWeeklyGoal);

              if (
                data.type === "Expense" ||
                data.type === "Recurring Expense"
              ) {
                weeklyGoal = weeklyGoal + data.value;
              } else {
                weeklyGoal = weeklyGoal - data.value;
              }

              await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: WEEKLY_GOAL_RANGE,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                  values: [[weeklyGoal]],
                },
              });
            }

            const isSamefiscalMonth = await isSameFiscalMonthById(
              data.fiscalMonthId,
              sheets
            );

            if (isSamefiscalMonth) {
              // Get and update current monthly goal
              const currentMonthlyGoalRes =
                await sheets.spreadsheets.values.get({
                  spreadsheetId: SPREADSHEET_ID,
                  range: MONTHLY_GOAL_RANGE,
                });
              const rawMonthlyGoal =
                currentMonthlyGoalRes.data.values?.[0]?.[0] || null;
              const cleanedMonthlyGoal = rawMonthlyGoal
                ? rawMonthlyGoal.replace(/[^0-9.-]/g, "")
                : "0";
              let monthlyGoal = parseFloat(cleanedMonthlyGoal);

              if (
                data.type === "Expense" ||
                data.type === "Recurring Expense"
              ) {
                monthlyGoal = monthlyGoal + data.value;
              } else {
                monthlyGoal = monthlyGoal - data.value;
              }

              await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: MONTHLY_GOAL_RANGE,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                  values: [[monthlyGoal]],
                },
              });
            }

            res.status(200).json({ status: "success", id });
          } catch (error) {
            console.error("Error deleting history item:", error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        } else if (data.itemType === "recurring") {
          try {
            // Get spreadsheet metadata to retrieve the sheetId
            const spreadsheetRes = await sheets.spreadsheets.get({
              spreadsheetId: SPREADSHEET_ID,
            });

            const sheet = spreadsheetRes.data.sheets?.find(
              (sheet) => sheet.properties?.title === RECURRING_TABLE_NAME
            );

            if (!sheet || !sheet.properties?.sheetId) {
              res.status(500).json({
                error: "Failed to retrieve sheetId for Recurring table.",
              });
              return;
            }

            const sheetId = sheet.properties.sheetId;

            // Get all rows from the Recurring table
            const recurringRes = await sheets.spreadsheets.values.get({
              spreadsheetId: SPREADSHEET_ID,
              range: RECURRING_RANGE,
            });

            const recurringRows = recurringRes.data.values || [];
            recurringRows.shift(); // Remove the header row without assigning it to a variable

            // Find the row index of the row with the matching ID
            const rowIndex = recurringRows.findIndex((row) => {
              return row[7] === id;
            });

            if (rowIndex === -1) {
              res.status(404).json({
                error: "Recurring item with the specified ID not found.",
              });
              return;
            }

            // Google Sheets uses 1-based indexing, and the header row is row 1
            const deleteRowIndex = rowIndex + 2; // Account for header row and 1-based index

            // Delete the row
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              requestBody: {
                requests: [
                  {
                    deleteDimension: {
                      range: {
                        sheetId, // Pass the valid sheetId
                        dimension: "ROWS",
                        startIndex: deleteRowIndex - 1, // Convert back to 0-based index
                        endIndex: deleteRowIndex, // Only delete one row
                      },
                    },
                  },
                ],
              },
            });

            res.status(200).json({ status: "success", id });
          } catch (error) {
            console.error("Error deleting recurring item:", error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        } else {
          res.status(400).json({ error: "Missing or invalid itemType" });
          return;
        }
      } else {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  }
);

/**
 * Helper function to convert ISO date string to MM/DD/YYYY format.
 *
 * @param {string} isoDateStr - The ISO date string (YYYY-MM-DD).
 * @returns {string} - The formatted date string (MM/DD/YYYY).
 */
function convertToMMDDYYYY(isoDateStr: string): string {
  const [yyyy, mm, dd] = isoDateStr.split("-");
  return `${parseInt(mm)}/${parseInt(dd)}/${yyyy}`;
}
