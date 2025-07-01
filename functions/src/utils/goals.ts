import {
  WEEKLY_GOAL_RANGE,
  MONTHLY_GOAL_RANGE,
  SPREADSHEET_ID,
} from "../config/constants";
import { updateSingleCellGoal } from "./sheets";
import {
  isSameFiscalWeekById,
  isSameFiscalMonthById,
  isExpenseType,
} from "./fiscal";
import { logAction } from "./logging";

/**
 * Adjusts goals if in the same fiscal period
 * @param sheets - The sheets API instance
 * @param oldValue - The old value of the expense
 * @param data - The data for the expense
 */
export async function adjustGoalIfSameFiscalPeriod(
  sheets: any,
  oldValue: number,
  data: any,
) {
  if (data.fiscalWeekId) {
    try {
      const sameWeek = await isSameFiscalWeekById(data.fiscalWeekId, sheets);
      if (sameWeek) {
        const wgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: WEEKLY_GOAL_RANGE,
        });
        const rawWG = wgData.data.values?.[0]?.[0] || "0";
        let weeklyGoal = parseFloat(rawWG.replace(/[^0-9.-]/g, ""));
        let difference = 0;

        if (data.value > oldValue) {
          difference = data.value - oldValue;
          weeklyGoal = isExpenseType(data.type)
            ? weeklyGoal - difference
            : weeklyGoal + difference;
        } else if (data.value < oldValue) {
          difference = oldValue - data.value;
          weeklyGoal = isExpenseType(data.type)
            ? weeklyGoal + difference
            : weeklyGoal - difference;
        }
        await updateSingleCellGoal(sheets, WEEKLY_GOAL_RANGE, weeklyGoal);
        await logAction(sheets, "UPDATE_WEEKLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawWG.replace(/[^0-9.-]/g, "")),
          oldValue: oldValue,
          newValue: data.value,
          difference: difference,
          after: weeklyGoal,
        });
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-week] error:", err);
    }
  }

  if (data.fiscalMonthId) {
    try {
      const sameMonth = await isSameFiscalMonthById(data.fiscalMonthId, sheets);
      if (sameMonth) {
        const mgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMG = mgData.data.values?.[0]?.[0] || "0";
        let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));
        let difference = 0;

        if (data.value > oldValue) {
          difference = data.value - oldValue;
          monthlyGoal = isExpenseType(data.type)
            ? monthlyGoal - difference
            : monthlyGoal + difference;
        } else if (data.value < oldValue) {
          difference = oldValue - data.value;
          monthlyGoal = isExpenseType(data.type)
            ? monthlyGoal + difference
            : monthlyGoal - difference;
        }
        await updateSingleCellGoal(sheets, MONTHLY_GOAL_RANGE, monthlyGoal);
        await logAction(sheets, "UPDATE_MONTHLY_GOAL", {
          itemType: data.itemType,
          type: data.type,
          userEmail: data.userEmail,
          before: parseFloat(rawMG.replace(/[^0-9.-]/g, "")),
          oldValue: oldValue,
          newValue: data.value,
          difference: difference,
          after: monthlyGoal,
        });
      }
    } catch (err) {
      console.error("[adjustGoalIfSameFiscalPeriod-month] error:", err);
    }
  }
}

/**
 * Changes goals if in the same fiscal period
 * @param sheets - The sheets API instance
 * @param data - The data for the expense
 */
export async function changeGoalIfSameFiscalPeriod(sheets: any, data: any) {
  if (data.fiscalWeekId) {
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
          ? weeklyGoal - data.value
          : weeklyGoal + data.value;
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
      console.error("[changeGoalIfSameFiscalPeriod-week] error:", err);
    }
  }

  if (data.fiscalMonthId) {
    try {
      const sameMonth = await isSameFiscalMonthById(data.fiscalMonthId, sheets);
      if (sameMonth) {
        const mgData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: MONTHLY_GOAL_RANGE,
        });
        const rawMG = mgData.data.values?.[0]?.[0] || "0";
        let monthlyGoal = parseFloat(rawMG.replace(/[^0-9.-]/g, ""));
        monthlyGoal = isExpenseType(data.type)
          ? monthlyGoal - data.value
          : monthlyGoal + data.value;
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
      console.error("[changeGoalIfSameFiscalPeriod-month] error:", err);
    }
  }
}
