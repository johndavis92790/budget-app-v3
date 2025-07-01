import { Request, Response } from "express";
import { logAction } from "../../utils/logging";
import { deleteItem } from "../../services/sheets-service";
import {
  WEEKLY_GOAL_RANGE,
  MONTHLY_GOAL_RANGE,
  SPREADSHEET_ID,
} from "../../config/constants";
import {
  isExpenseType,
  isSameFiscalWeekById,
  isSameFiscalMonthById,
} from "../../utils/fiscal";
import { updateSingleCellGoal } from "../../utils/sheets";

/**
 * Handles DELETE requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
export async function handleDELETE(sheets: any, req: Request, res: Response) {
  const data = req.body;
  const id = data.id;
  if (!id) {
    res.status(400).json({ error: "Missing id field in request body." });
    return;
  }

  try {
    if (data.itemType === "history") {
      try {
        await deleteItem(sheets, "history", id);
      } catch (deleteError) {
        throw deleteError;
      }

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
      try {
        await deleteItem(sheets, "recurring", id);
      } catch (deleteError) {
        throw deleteError;
      }

      await logAction(sheets, "DELETE_RECURRING", data);
      res.status(200).json({ status: "success", id });
    } else {
      res.status(400).json({ error: "Missing or invalid itemType" });
    }
  } catch (error: any) {
    await logAction(sheets, "DELETE_ERROR", data, error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
