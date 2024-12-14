import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { google } from "googleapis";

const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";

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
        // Fetch Expenses
        const expensesRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Expenses!A1:F",
        });

        const expensesRows = expensesRes.data.values || [];
        expensesRows.shift(); // Remove headers

        const expensesData = expensesRows.map((row, index) => {
          const rawValue = row[4];
          const cleanedValue = rawValue
            ? rawValue.replace(/[^0-9.-]/g, "")
            : "0";
          const value = parseFloat(cleanedValue);
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
            rowIndex: index + 2, // Track row number in the sheet
          };
        });

        // Fetch Lists for Categories and Tags
        const listsRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Lists!A1:B",
        });

        const listsRows = listsRes.data.values || [];
        listsRows.shift(); // Remove headers row

        const categories = listsRows.map((row) => row[0]).filter(Boolean); // Column A
        const tags = listsRows.map((row) => row[1]).filter(Boolean); // Column B

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
          typeof data.value !== "number"
        ) {
          res.status(400).json({ error: "Missing or invalid required fields" });
          return;
        }

        const tagsStr = data.tags.join(", ");

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: "Expenses!A:F",
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                dateFormatted,
                data.type,
                data.categories,
                tagsStr,
                data.value,
                data.notes || "",
              ],
            ],
          },
        });

        res.status(200).json({ status: "success" });
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
          typeof data.value !== "number"
        ) {
          res.status(400).json({ error: "Missing or invalid required fields" });
          return;
        }

        const tagsStr = data.tags.join(", ");
        const rowIndex = data.rowIndex;

        // Update the specific row
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Expenses!A${rowIndex}:F${rowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                dateFormatted,
                data.type,
                data.categories,
                tagsStr,
                data.value,
                data.notes || "",
              ],
            ],
          },
        });

        res.status(200).json({ status: "success" });
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
