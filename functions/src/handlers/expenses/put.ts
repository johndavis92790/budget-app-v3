import { Request, Response } from "express";
import { logAction } from "../../utils/logging";
import { updateItem } from "../../services/sheets-service";
import {
  WEEKLY_GOAL_RANGE,
  MONTHLY_GOAL_RANGE,
} from "../../config/constants";
import { sendExpenseNotification } from "../../utils/notificationHelper";
import { adjustGoalIfSameFiscalPeriod } from "../../utils/goals";
import {
  columnMappings,
  parseCellValue,
  updateSingleCellGoal,
} from "../../utils/sheets";

/**
 * Handles PUT requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
export async function handlePUT(sheets: any, req: Request, res: Response) {
  const data = req.body;
  try {
    switch (data.itemType) {
      case "history": {
        if (
          !data.date ||
          !data.type ||
          typeof data.category !== "string" ||
          !Array.isArray(data.tags) ||
          typeof data.value !== "number" ||
          !data.id
        ) {
          if (data.hsa === true) {
            if (!data.hsaAmount) {
              res.status(400).json({ error: "Missing or invalid required fields" });
              return;
            }
          }
        }
        const originalRow = await updateItem(sheets, data, "history");

        if (!originalRow || !Array.isArray(originalRow)) {
          res
            .status(500)
            .json({
              error:
                "Internal server error: Missing or invalid response from updateItem",
            });
          return;
        }

        // Ensure the VALUE index exists in the array
        if (columnMappings.HISTORY.VALUE >= originalRow.length) {
          console.error(
            `ERROR - Index ${columnMappings.HISTORY.VALUE} is out of bounds for originalRow of length ${originalRow.length}`
          );
          res
            .status(500)
            .json({ error: "Internal server error: Invalid column mapping" });
          return;
        }

        const rawOriginalValue = originalRow[columnMappings.HISTORY.VALUE];

        const originalValue = parseCellValue(rawOriginalValue);

        if (data.value !== originalValue) {
          await adjustGoalIfSameFiscalPeriod(sheets, originalValue, data);
        }

        await logAction(sheets, "UPDATE_HISTORY", data);
        
        // Send notification for updated expense (don't await to avoid blocking response)
        sendExpenseNotification(data, "updated").catch((error) => {
          console.error("Failed to send expense update notification:", error);
        });
        
        res.status(200).json({ status: "success", id: data.id });
        break;
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
          res.status(400).json({ error: "Missing or invalid required fields" });
          return;
        }

        await updateItem(sheets, data, "recurring");

        await logAction(sheets, "UPDATE_RECURRING", data);
        res.status(200).json({ status: "success", id: data.id });
        break;
      }

      case "weeklyGoal": {
        if (typeof data.value !== "number") {
          res.status(400).json({ error: "Missing or invalid goal" });
          return;
        }
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, data.value);
        await logAction(sheets, "UPDATE_WEEKLY_GOAL", data);
        res.status(200).json({ status: "success" });
        break;
      }

      case "monthlyGoal": {
        if (typeof data.value !== "number") {
          res.status(400).json({ error: "Missing or invalid goal" });
          return;
        }
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, data.value);
        await logAction(sheets, "UPDATE_MONTHLY_GOAL", data);
        res.status(200).json({ status: "success" });
        break;
      }

      default:
        res.status(400).json({ error: "Invalid or missing itemType" });
        return;
    }
  } catch (err: any) {
    console.error("Error in handlePUT:", err);
    await logAction(sheets, "PUT_ERROR", data, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
