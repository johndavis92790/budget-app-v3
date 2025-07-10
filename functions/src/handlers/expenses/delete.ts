import { Request, Response } from "express";
import { logAction } from "../../utils/logging";
import { deleteItem } from "../../services/sheets-service";
import {
  WEEKLY_GOAL_RANGE,
  MONTHLY_GOAL_RANGE,
  SPREADSHEET_ID,
  HSA_TABLE_NAME,
  HSA_RANGE,
} from "../../config/constants";
import {
  isExpenseType,
  isSameFiscalWeekById,
  isSameFiscalMonthById,
} from "../../utils/fiscal";
import { updateSingleCellGoal, getSheetData, columnMappings, deleteRow } from "../../utils/sheets";


/**
 * Deletes an HSA item by historyId
 * @param sheets - The sheets API instance
 * @param historyId - The historyId of the HSA item to delete
 * @returns Boolean indicating success
 */
async function deleteHsaItem(sheets: any, historyId: string): Promise<boolean> {
  try {
    // Get the spreadsheet info to find the sheet ID
    const spreadsheetRes = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const hsaSheet = spreadsheetRes.data.sheets?.find(
      (sh: any) => sh.properties?.title === HSA_TABLE_NAME,
    );
    if (!hsaSheet || !hsaSheet.properties?.sheetId) {
      throw new Error(`Failed to retrieve sheetId for ${HSA_TABLE_NAME}.`);
    }
    
    // Get all HSA rows
    const hsaRows = await getSheetData(sheets, HSA_RANGE, false);
    hsaRows.shift(); // remove header row
    
    // Find the HSA row by historyId
    const hsaMap = columnMappings.HSA;
    const rowIndex = hsaRows.findIndex(
      (row) => row[hsaMap.HISTORY_ID] === historyId
    );
    
    if (rowIndex === -1) {
      return false;
    }
    
    // Convert to 1-based + header
    const deleteRowIndex = rowIndex + 2;
    await deleteRow(
      sheets,
      SPREADSHEET_ID,
      hsaSheet.properties.sheetId,
      deleteRowIndex,
    );
    
    return true;
  } catch (error) {
    console.error("Error in deleteHsaItem:", error);
    return false;
  }
}

/**
 * Handles DELETE requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
export async function handleDELETE(sheets: any, req: Request, res: Response) {
  const data = req.body;
  
  // HSA items are deleted by historyId rather than id
  const id = data.itemType === "hsa" ? data.historyId : data.id;
  if (!id) {
    res.status(400).json({ error: "Missing id/historyId field in request body." });
    return;
  }

  try {
    if (data.itemType === "history") {
      try {
        await deleteItem(sheets, "history", id);
        
        // Check if the history item has an associated HSA item and delete it if it exists
        try {
          const hsaDeleted = await deleteHsaItem(sheets, id);
          if (hsaDeleted) {
            await logAction(sheets, "DELETE_HSA_AUTO", {
              historyId: id,
              userEmail: data.userEmail || "unknown"
            });
          }
        } catch (hsaError) {
          console.error("Error deleting associated HSA item:", hsaError);
          // Don't throw error here, we want to continue even if HSA deletion fails
        }
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
    } else if (data.itemType === "hsa") {
      try {
        const success = await deleteHsaItem(sheets, id);
        if (!success) {
          res.status(404).json({ error: "HSA item not found" });
          return;
        }
        
        await logAction(sheets, "DELETE_HSA", data);
        res.status(200).json({ status: "success", historyId: id });
      } catch (deleteError) {
        throw deleteError;
      }
    } else {
      res.status(400).json({ error: "Missing or invalid itemType" });
    }
  } catch (error: any) {
    await logAction(sheets, "DELETE_ERROR", data, error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
