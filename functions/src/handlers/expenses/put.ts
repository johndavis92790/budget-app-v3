import { Request, Response } from "express";
import { logAction } from "../../utils/logging";
import { updateItem } from "../../services/sheets-service";
import { WEEKLY_GOAL_RANGE, MONTHLY_GOAL_RANGE, HSA_TABLE_NAME, HSA_RANGE } from "../../config/constants";
import { adjustGoalIfSameFiscalPeriod } from "../../utils/goals";
import { columnMappings, parseCellValue, updateSingleCellGoal, getSheetData, updateSheetRow, createSheetRow } from "../../utils/sheets";

/**
 * Handles PUT requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
/**
 * Updates an HSA item in the HSA sheet
 * @param sheets - The sheets API instance
 * @param hsaData - The HSA data to update
 * @returns Boolean indicating success
 */
async function updateHsaItem(sheets: any, hsaData: any): Promise<boolean> {
  try {
    // Get HSA data from the sheet
    const hsaRows = await getSheetData(sheets, HSA_RANGE, false);
    hsaRows.shift(); // remove header row
    
    // Find the HSA row by historyId
    const hsaMap = columnMappings.HSA;
    const hsaRowIndex = hsaRows.findIndex(
      (row) => row[hsaMap.HISTORY_ID] === hsaData.historyId
    );

    if (hsaRowIndex === -1) {
      console.error(`HSA item with historyId ${hsaData.historyId} not found.`);
      return false;
    }

    // Convert to 1-based + header
    const rowIndex = hsaRowIndex + 2;
    const rowRange = `${HSA_TABLE_NAME}!A${rowIndex}:D${rowIndex}`;

    // Create data object for the HSA item
    const hsaItemData = {
      HISTORY_ID: hsaData.historyId,
      REIMBURSEMENT_AMOUNT: hsaData.reimbursementAmount,
      REIMBURSEMENT_DATE: hsaData.reimbursementDate || "",
      NOTES: hsaData.notes || ""
    };

    // Create the row data and update the sheet
    const rowData = createSheetRow(hsaItemData, "HSA");
    await updateSheetRow(sheets, rowRange, [rowData]);
    return true;
  } catch (error) {
    console.error("Error in updateHsaItem:", error);
    return false;
  }
}

export async function handlePUT(sheets: any, req: Request, res: Response) {
  const data = req.body;
  try {
    switch (data.itemType) {
      case "history": {
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
        const originalRow = await updateItem(sheets, data, "history");
        
        if (!originalRow || !Array.isArray(originalRow)) {
          res.status(500).json({ error: "Internal server error: Missing or invalid response from updateItem" });
          return;
        }
        
        // Ensure the VALUE index exists in the array
        if (columnMappings.HISTORY.VALUE >= originalRow.length) {
          console.error(`ERROR - Index ${columnMappings.HISTORY.VALUE} is out of bounds for originalRow of length ${originalRow.length}`);
          res.status(500).json({ error: "Internal server error: Invalid column mapping" });
          return;
        }
        
        const rawOriginalValue = originalRow[columnMappings.HISTORY.VALUE];
        
        const originalValue = parseCellValue(rawOriginalValue);
        
        if (data.value !== originalValue) {
          await adjustGoalIfSameFiscalPeriod(sheets, originalValue, data);
        }

        await logAction(sheets, "UPDATE_HISTORY", data);
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

      case "hsa": {
        // Validate required fields for HSA update
        if (
          !data.historyId ||
          typeof data.reimbursementAmount !== "number"
        ) {
          res.status(400).json({ error: "Missing or invalid required HSA fields" });
          return;
        }

        const success = await updateHsaItem(sheets, data);
        if (!success) {
          res.status(404).json({ error: "HSA item not found or update failed" });
          return;
        }

        await logAction(sheets, "UPDATE_HSA", data);
        res.status(200).json({ status: "success", historyId: data.historyId });
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
