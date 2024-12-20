import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";
const FRONTEND_URL = "https://budget-app-v3.web.app";
const NON_RECURRING_TABLE_NAME = "Non-Recurring";
// const RECURRING_TABLE_NAME = "Recurring";
const FIRST_COLUMN = "A";
const LAST_COLUMN = "I"; // A-I includes ID in column I
const NON_RECURRING_RANGE = `${NON_RECURRING_TABLE_NAME}!${FIRST_COLUMN}1:${LAST_COLUMN}`;
const METADATA_RANGE = "Metadata!A1:B";

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
      if (req.method === "GET") {
        // Get expenses
        const expensesRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: NON_RECURRING_RANGE,
        });

        const expensesRows = expensesRes.data.values || [];
        expensesRows.shift(); // Remove headers row

        // Indices: A=0,B=1,C=2,D=3,E=4,F=5,G=6(editURL),H=7(hyperlink),I=8(id)
        const editURLColIndex = 6;
        const idColIndex = 8;

        const expensesData = expensesRows.map((row, index) => {
          const rawValue = row[4];
          const cleanedValue = rawValue
            ? rawValue.replace(/[^0-9.-]/g, "")
            : "0";
          const value = parseFloat(cleanedValue);
          const editURL = row[editURLColIndex] || "";
          const id = row[idColIndex] || "";

          return {
            date: row[0],
            type: row[1],
            categories: row[2],
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

        // Get categories & tags lists
        const listsRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: METADATA_RANGE,
        });

        const listsRows = listsRes.data.values || [];
        listsRows.shift(); // Remove headers
        const categories = listsRows.map((row) => row[0]).filter(Boolean);
        const tags = listsRows.map((row) => row[1]).filter(Boolean);

        res.status(200).json({ expenses: expensesData, categories, tags });
        return;
      } else if (req.method === "POST") {
        const data = req.body;
        const dateFormatted = convertToMMDDYYYY(data.date);

        if (
          !data.date ||
          !data.type ||
          typeof data.categories !== "string" ||
          !Array.isArray(data.tags) ||
          typeof data.value !== "number" ||
          !data.id
        ) {
          res.status(400).json({ error: "Missing or invalid required fields" });
          return;
        }

        const id = data.id; // This is the numeric ID from the frontend
        const editURL = `${FRONTEND_URL}/edit?id=${encodeURIComponent(id)}`;
        const hyperlinkFormula = `=HYPERLINK("${editURL}", "Edit")`;

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: NON_RECURRING_RANGE,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                dateFormatted, // A=date
                data.type, // B=type
                data.categories, // C=categories
                data.tags.join(", "), // D=tags
                data.value, // E=value
                data.notes || "", // F=notes
                editURL, // G=editLink
                hyperlinkFormula, // H=hyperlink
                id, // I=id (no prefix, just the numeric string)
              ],
            ],
          },
        });

        res.status(200).json({ status: "success", id: id });
        return;
      } else if (req.method === "PUT") {
        const data = req.body;
        const dateFormatted = convertToMMDDYYYY(data.date);

        if (
          !data.rowIndex ||
          !data.date ||
          !data.type ||
          typeof data.categories !== "string" ||
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
        const rowRange = `${NON_RECURRING_TABLE_NAME}!${FIRST_COLUMN}${rowIndex}:${LAST_COLUMN}${rowIndex}`;
        const existingRowRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: rowRange,
        });

        const existingRow =
          existingRowRes.data.values && existingRowRes.data.values[0];
        if (!existingRow) {
          res.status(404).json({ error: "Expense not found" });
          return;
        }

        const existingId = existingRow[8]; // column I for id
        if (!existingId) {
          res
            .status(500)
            .json({ error: "ID not found in the existing expense row" });
          return;
        }

        // The editURL should always use the existingId, no matter what
        const editURL = `${FRONTEND_URL}/edit?id=${encodeURIComponent(existingId)}`;
        const hyperlinkFormula = `=HYPERLINK("${editURL}", "Edit")`;

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: rowRange,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                dateFormatted,
                data.type,
                data.categories,
                tagsStr,
                data.value,
                data.notes || "",
                editURL,
                hyperlinkFormula,
                existingId, // Preserve the same numeric ID
              ],
            ],
          },
        });

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
