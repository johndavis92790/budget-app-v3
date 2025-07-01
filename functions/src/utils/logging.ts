import { LOGS_RANGE, SPREADSHEET_ID } from "../config/constants";
import { createSheetRow } from "./sheets";

/**
 * Helper to get MST timestamp in format: 2025-01-03T14:05:06
 */
export function getMstTimestamp(): string {
  const now = new Date();
  // Convert to MST (UTC-7)
  const mstOffset = -7 * 60;
  const userOffset = now.getTimezoneOffset();
  const offsetDiff = userOffset - mstOffset;

  const mstTime = new Date(now.getTime() + offsetDiff * 60 * 1000);

  const year = mstTime.getFullYear();
  const month = String(mstTime.getMonth() + 1).padStart(2, "0");
  const day = String(mstTime.getDate()).padStart(2, "0");
  const hour = String(mstTime.getHours()).padStart(2, "0");
  const minute = String(mstTime.getMinutes()).padStart(2, "0");
  const second = String(mstTime.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * LOG ACTION HELPER
 * Appends a row to the Logs sheet with columns mapped to:
 * TIMESTAMP = Timestamp (MST)
 * USER_EMAIL = User Email
 * ACTION = Action
 * DATA = Data (formatted JSON)
 * ERROR = Error (formatted JSON if any)
 */
/**
 * Logs an action to the Logs sheet
 * @param sheets - The sheets API instance
 * @param actionType - The type of action
 * @param data - The data for the action
 * @param errorMessage - Optional error message
 */
export async function logAction(
  sheets: any,
  actionType: string,
  data: Record<string, any> = {},
  errorMessage?: string,
) {
  // 1) Generate MST timestamp
  const timestamp = getMstTimestamp();

  // 2) Extract userEmail from the request body if available
  const userEmail = data.userEmail || "";

  // 3) Pretty-print data & error as multi-line JSON
  const dataStr =
    Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "";
  const errorStr = errorMessage ? JSON.stringify(errorMessage, null, 2) : "";

  // 4) Create log data object
  const logData = {
    TIMESTAMP: timestamp,
    USER_EMAIL: userEmail,
    ACTION: actionType,
    DATA: dataStr,
    ERROR: errorStr,
  };

  // 5) Create the row data using our robust helper
  const rowData = createSheetRow(logData, "LOGS");

  // 6) Append it to the Logs sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: LOGS_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [rowData] },
  });
}
