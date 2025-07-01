import { Request, Response } from "express";
import { logAction } from "../../utils/logging";
import { insertItem } from "../../services/sheets-service";
import { cachedFiscalMonths, cachedFiscalWeeks, cachedFiscalYears, getFiscalIDs } from "../../utils/fiscal";
import { changeGoalIfSameFiscalPeriod } from "../../utils/goals";

/**
 * Handles POST requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
export async function handlePOST(sheets: any, req: Request, res: Response) {
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
        cachedFiscalWeeks!,
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
