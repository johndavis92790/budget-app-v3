import * as functions from "firebase-functions";
import { google } from "googleapis";

// Replace these values with your actual configuration
const SPREADSHEET_ID = "1KROs_Swh-1zeQhLajtRw-E7DcYnJRMHEOXX5ECwTGSI";
// This should be the JSON object from your service account key
const SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "budget-app-v3-1",
  private_key_id: "250ed8405aea7232277ebeb26ff4da692582b285",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDd9IVvuT/w/IdS\nK2EixI8Xn/H+Jdq+mWjSLX7FBDT/DvJTcqhPTxEiJzH5xbod3v5AuBjI6wqAKYVJ\nshAopJbpS1fqmM7lynB5t+Poj2iytMDfhbKupubFEuCT7XjNyKOwNBkGtMKJ1bwD\nfppE06jzjh0BNRnbLhx9FvqWFeLvWZPUVRjaY3mGV0VzKTdHYm42Pp+2yUyDohbm\nNvnKZUYvbQOspO/cCaX2yHI4bxyctuRGDpU9g9aIv3us40qd0AVZglngqyu62SZj\nhZpv1rk3wNtfJgxKQ+k7XepXRWsoBtoeP/dq9QEQnmEWGTu1V7+N8v21ha1KTDXh\nclA6WVHVAgMBAAECggEABXhZG4jzaviGSz+iHA2/wGN4PtJnAuCGr/tgDvH3bmZ2\nEW7CItDo3rBxml1wT1Enb1KPhdAec6HSVPUhpybF81z11I8h4ObtgQpyVaZx0Z8D\ny9511LkXTI8WYCmaRb67+K6SrqggzUMqaDmkCq3evECUisA+HA6VtCgvUn3v7a8k\nietA0lzMfN8dD32NcUP/wdh2e3yxrNITscer6zxatEHqAj3TO2LOypd6i9+vO0wg\nhnwg2HXC5/cyD9liNEZ2wAuggxYxdapYVX7TGC3rfQq4UkX0sxDHljv9rb6fluZ/\nUIFgER5WlRZ6EAbSSVI32tOkW5Q9nCZMvSIAum+RRwKBgQD/GSxho3CguL1lFKRe\np+oa6e2LrGnfC31vHD+AWt7Hdv9BDU1XHR7pmHnniUsbJ5x8kKIr7KXyNCnyw+z9\nRhSxIi7RbnwtEntxwcS2kJyYHe8QggpW/GOJNstsx5QRlLMP3qtdI32CBHjRuNYs\nukSwgVLoQrmOtMpybpWQ2IsniwKBgQDevVuv9U/ADO5kkO3+WQbxc1M4BwQvwjNr\nc1Dw7lwAMfpHazJGUerJddqNbavEwXfyYFa5XpzZkcZEuPjvbyLnMdnnReCcQMrb\nkXt6+O2FnuynLSiNBBliNUxDb0IwreorkMEF+rCTjuXYuMKFK8JGwQyFDGsx1Rrq\njjD1Tq+YHwKBgFFmBvNg459lU4ndfFV33wuXeWUILwAs+mlp6hla5ZtgLTLku7kA\nYczICp4HASA5E4Xr4NODP7B5VKlSO1zV7+RVs/q/9n+rVhiGa+6VVmJzqsTpucLn\n5hrykRa02FqDyF9X/fZKTNIf+y1wfWboSOLJYVsbb3pJ1g+NmcwOTNjhAoGBAMrn\nqr928+han0xDblpWVWncicGvOpQbD+ZhTSm9qVeQL5OhxlGizAQr9SUC9Aevyomk\nUzxYQQA9uGTgL/1Fu4Dqu7rfwAX3TBSKyfazDwS7So/cJmWXh1wce1Wu45gexgRb\nwEqnHPW+pgkv/ht8SmVT9Qi60Ge73uIvF9BPlsw3AoGBAIPJ+964pmrjNP0xCk4V\nf+XjKkGPgGVRmMQBKjyOXAfyzOH7P1Pcd5+g1cpxnTbc9lU7k4MgvGB6MC2x17Oh\n2yI7Ki2UKlBBgazy7LgOBQElCIFCazRkB/qBD84EZbaGuT3QjIGK2+QnARPkJsf1\ngfmhWQjA1pm27Oiqp0R3th0D\n-----END PRIVATE KEY-----\n",
  client_email: "budget-app-v3-sheet@budget-app-v3-1.iam.gserviceaccount.com",
  client_id: "117276753568615594095",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/budget-app-v3-sheet%40budget-app-v3-1.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const jwtClient = new google.auth.JWT(
  SERVICE_ACCOUNT.client_email,
  undefined,
  SERVICE_ACCOUNT.private_key,
  SCOPES
);

const sheets = google.sheets({ version: "v4", auth: jwtClient });

export const expenses = functions.https.onRequest(async (req, res) => {
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
      // Fetch Expenses
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
      listsRows.shift(); // remove headers row instead of assigning to headers

      // Assuming Column A is Categories, Column B is Tags
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
});
