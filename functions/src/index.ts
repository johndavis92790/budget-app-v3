import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";
// const FRONTEND_URL = "https://budget-app-v3.web.app";
const HISTORY_TABLE_NAME = "History";
const HISTORY_FIRST_COLUMN = "A";
const HISTORY_LAST_COLUMN = "I";
const HISTORY_RANGE = `${HISTORY_TABLE_NAME}!${HISTORY_FIRST_COLUMN}1:${HISTORY_LAST_COLUMN}`;

const RECURRING_TABLE_NAME = "Recurring";
const RECURRING_FIRST_COLUMN = "A";
const RECURRING_LAST_COLUMN = "G";
const RECURRING_RANGE = `${RECURRING_TABLE_NAME}!${RECURRING_FIRST_COLUMN}1:${RECURRING_LAST_COLUMN}`;

const METADATA_RANGE = "Metadata!A1:F";

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
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      //-------------------------GET----------------------------------------------------
      if (req.method === "GET") {
        // Get history
        const historyRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: HISTORY_RANGE,
        });

        const historyRows = historyRes.data.values || [];
        historyRows.shift(); // Remove headers row

        // Indices: A=0,B=1,C=2,D=3,E=4,F=5,G=6,H=7,I=8
        const historyEditURLColIndex = 6;
        const historyIDColIndex = 8;

        const historyData = historyRows.map((row, index) => {
          const rawValue = row[4];
          const cleanedValue = rawValue
            ? rawValue.replace(/[^0-9.-]/g, "")
            : "0";
          const value = parseFloat(cleanedValue);
          const editURL = row[historyEditURLColIndex] || "";
          const id = row[historyIDColIndex] || "";

          return {
            date: row[0],
            type: row[1],
            category: row[2],
            tags: row[3]
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
            value: value,
            notes: row[5],
            editURL: editURL,
            rowIndex: index + 2,
            id: id,
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
        const editURLColIndex = 4;
        const idColIndex = 6;

        const recurringData = recurringRows.map((row, index) => {
          const rawValue = row[2];
          const cleanedValue = rawValue
            ? rawValue.replace(/[^0-9.-]/g, "")
            : "0";
          const value = parseFloat(cleanedValue);
          const editURL = row[editURLColIndex] || "";
          const id = row[idColIndex] || "";

          return {
            type: row[0],
            tags: row[1]
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
            value: value,
            name: row[3],
            editURL: editURL,
            rowIndex: index + 2,
            id: id,
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
        const nonRecurringTypes = listsRows
          .map((row) => row[3])
          .filter(Boolean);
        const recurringTypes = listsRows.map((row) => row[4]).filter(Boolean);
        const historyTypes = listsRows.map((row) => row[5]).filter(Boolean);

        res.status(200).json({
          history: historyData,
          recurring: recurringData,
          categories,
          nonRecurringTags,
          recurringTags,
          nonRecurringTypes,
          recurringTypes,
          historyTypes,
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
                  data.notes || "", // F=notes
                  data.editURL, // G=editLink
                  hyperlinkFormula, // H=hyperlink
                  id, // I=id (no prefix, just the numeric string)
                ],
              ],
            },
          });
        } else if (data.itemType === "recurring") {
          if (
            !data.type ||
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
                  data.tags.join(", "), // B=tags
                  data.value, // C=value
                  data.name || "", // D=name
                  data.editURL, // E=editLink
                  hyperlinkFormula, // F=hyperlink
                  id, // G=id (no prefix, just the numeric string)
                ],
              ],
            },
          });
        } else {
          res.status(400).json({ error: "Missing or invalid itemType" });
          return;
        }

        res.status(200).json({ status: "success", id: id });
        return;
        //-------------------------PUT----------------------------------------------------
      } else if (req.method === "PUT") {
        const data = req.body;
        let existingId;

        if (data.itemType === "history") {
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
            res.status(400).json({ error: "Missing or invalid required fields" });
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
                  data.notes || "",
                  existingEditURL,
                  hyperlinkFormula,
                  existingId, // Preserve the same numeric ID
                ],
              ],
            },
          });
        } else if (data.itemType === "recurring") {
          if (
            !data.rowIndex ||
            !data.type ||
            !Array.isArray(data.tags) ||
            typeof data.value !== "number" ||
            !data.name ||
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

          existingId = existingRow[6]; // column G for id
          const existingEditURL = existingRow[4]; // column E for editURL
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
                  tagsStr,
                  data.value,
                  data.name,
                  existingEditURL,
                  hyperlinkFormula,
                  existingId, // Preserve the same numeric ID
                ],
              ],
            },
          });
        }

        // No matter if images are removed or added outside, the ID and link remain stable.
        res.status(200).json({ status: "success", id: existingId });
        return;
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

function convertToMMDDYYYY(isoDateStr: string): string {
  const [yyyy, mm, dd] = isoDateStr.split("-");
  return `${parseInt(mm)}/${parseInt(dd)}/${yyyy}`;
}
