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

    // Replace escaped \n in the private key if needed
    const privateKey = SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");

    const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
    const jwtClient = new google.auth.JWT(
      SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      SCOPES
    );

    const sheets = google.sheets({ version: "v4", auth: jwtClient });

    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      if (req.method === "GET") {
        const expensesRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Expenses!A1:F",
        });

        const expensesRows = expensesRes.data.values || [];
        expensesRows.shift(); // remove headers

        const expensesData = expensesRows.map((row) => {
          return {
            date: row[0],
            type: row[1],
            categories: row[2]
              .split(",")
              .map((c: string) => c.trim())
              .filter(Boolean),
            tags: row[3]
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
            value: parseFloat(row[4]),
            notes: row[5],
          };
        });

        // Fetch Lists for Categories and Tags
        const listsRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Lists!A1:B",
        });

        const listsRows = listsRes.data.values || [];
        listsRows.shift(); // remove headers

        const categories = listsRows.map((row) => row[0]).filter((c) => c);
        const tags = listsRows.map((row) => row[1]).filter((t) => t);

        res.status(200).json({ expenses: expensesData, categories, tags });
        return;
      } else if (req.method === "POST") {
        const data = req.body;
        // Expecting:
        // {
        //   "date": "2024-12-07",
        //   "type": "Expense" or "Refund",
        //   "categories": ["Food", "Groceries"],
        //   "tags": ["Urgent", "Family"],
        //   "value": 5.99,
        //   "notes": "Milk and bread"
        // }

        if (
          !data.date ||
          !data.type ||
          !Array.isArray(data.categories) ||
          !Array.isArray(data.tags) ||
          typeof data.value !== "number"
        ) {
          res.status(400).json({ error: "Missing or invalid required fields" });
          return;
        }

        const categoriesStr = data.categories.join(", ");
        const tagsStr = data.tags.join(", ");

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: "Expenses!A:F",
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                data.date,
                data.type,
                categoriesStr,
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
