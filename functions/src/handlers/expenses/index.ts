import { Request, Response } from "express";
import { google } from "googleapis";

import { initializeColumnMappings } from "../../utils/sheets";
import { fetchAndCacheFiscalData } from "../../utils/fiscal";
import { logAction } from "../../utils/logging";

import { handleGET } from "./get";
import { handlePOST } from "./post";
import { handlePUT } from "./put";
import { handleDELETE } from "./delete";

/**
 * Handles all expenses-related requests
 * @param req - The request object
 * @param res - The response object
 */
export const expensesHandler = async (req: Request, res: Response) => {
  const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_CLIENT_EMAIL;
  const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error(
      "Service account credentials are not set in environment variables.",
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
    SCOPES,
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
    // Initialize column mappings for all sheets
    await initializeColumnMappings(sheets);

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
    // Try to extract email from the request if possible
    const logData: Record<string, any> = {};
    if (req.body && req.body.userEmail) {
      logData.userEmail = req.body.userEmail;
    }
    await logAction(sheets, "TOP_LEVEL_ERROR", logData, error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
