import { Request, Response } from "express";
import {
  HISTORY_RANGE,
  RECURRING_RANGE,
  METADATA_RANGE,
  SPREADSHEET_ID,
  FISCAL_MONTHS_RANGE,
  FISCAL_WEEKS_RANGE,
  FISCAL_YEARS_RANGE,
  MONTHLY_GOAL_RANGE,
  WEEKLY_GOAL_RANGE,
} from "../../config/constants";
import { getSheetData, columnMappings, convertArrayToObjectById, parseCellValue } from "../../utils/sheets";

/**
 * Handles GET requests for expense data
 * @param sheets - The sheets API instance
 * @param req - The request object
 * @param res - The response object
 */
export async function handleGET(sheets: any, req: Request, res: Response) {
  const historyRows = await getSheetData(sheets, HISTORY_RANGE);
  const historyMap = columnMappings.HISTORY;

  const historyData = historyRows.map((row) => ({
    date: row[historyMap.DATE],
    type: row[historyMap.TYPE],
    category: row[historyMap.CATEGORY],
    tags: row[historyMap.TAGS]
      ?.split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
    value: parseCellValue(row[historyMap.VALUE]),
    hsa: row[historyMap.HSA],
    description: row[historyMap.DESCRIPTION],
    editURL: row[historyMap.EDIT_URL] || "",
    id: row[historyMap.ID] || "",
    fiscalYearId: row[historyMap.FISCAL_YEAR_ID],
    fiscalMonthId: row[historyMap.FISCAL_MONTH_ID],
    fiscalWeekId: row[historyMap.FISCAL_WEEK_ID],
    itemType: "history",
  }));

  const recurringRows = await getSheetData(sheets, RECURRING_RANGE);
  const recurringMap = columnMappings.RECURRING;

  const recurringData = recurringRows.map((row) => ({
    type: row[recurringMap.TYPE],
    category: row[recurringMap.CATEGORY],
    tags: row[recurringMap.TAGS]
      ?.split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
    value: parseCellValue(row[recurringMap.VALUE]),
    description: row[recurringMap.DESCRIPTION],
    editURL: row[recurringMap.EDIT_URL] || "",
    id: row[recurringMap.ID] || "",
    itemType: "recurring",
  }));

  const listsAll = await getSheetData(sheets, METADATA_RANGE, false);
  const listsRows = listsAll.slice(1);
  const metadataMap = columnMappings.METADATA;
  const categories = listsRows
    .map((row) => row[metadataMap.CATEGORY])
    .filter(Boolean);
  const tags = listsRows.map((row) => row[metadataMap.TAG]).filter(Boolean);

  const [wgResp, mgResp] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: WEEKLY_GOAL_RANGE,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: MONTHLY_GOAL_RANGE,
    }),
  ]);
  const weeklyGoalRaw = wgResp.data.values?.[0]?.[0] || "0";
  const monthlyGoalRaw = mgResp.data.values?.[0]?.[0] || "0";
  const weeklyGoal = parseFloat(weeklyGoalRaw.replace(/[^0-9.-]/g, ""));
  const monthlyGoal = parseFloat(monthlyGoalRaw.replace(/[^0-9.-]/g, ""));

  let fiscalWeekData = (await getSheetData(sheets, FISCAL_WEEKS_RANGE)).map(
    (row) => ({
      id: row[columnMappings.FISCAL_WEEKS.ID],
      number: row[columnMappings.FISCAL_WEEKS.NUMBER],
      start_date: row[columnMappings.FISCAL_WEEKS.START_DATE],
      end_date: row[columnMappings.FISCAL_WEEKS.END_DATE],
      year_title: row[columnMappings.FISCAL_WEEKS.YEAR_TITLE],
      month_id: row[columnMappings.FISCAL_WEEKS.MONTH_ID],
      itemType: "fiscalWeek",
    }),
  );
  let fiscalMonthData = (await getSheetData(sheets, FISCAL_MONTHS_RANGE)).map(
    (row) => ({
      id: row[columnMappings.FISCAL_MONTHS.ID],
      start_date: row[columnMappings.FISCAL_MONTHS.START_DATE],
      end_date: row[columnMappings.FISCAL_MONTHS.END_DATE],
      year_title: row[columnMappings.FISCAL_MONTHS.YEAR_TITLE],
      itemType: "fiscalMonth",
    }),
  );
  let fiscalYearData = (await getSheetData(sheets, FISCAL_YEARS_RANGE)).map(
    (row) => ({
      id: row[columnMappings.FISCAL_YEARS.ID],
      title: row[columnMappings.FISCAL_YEARS.TITLE],
      start_date: row[columnMappings.FISCAL_YEARS.START_DATE],
      end_date: row[columnMappings.FISCAL_YEARS.END_DATE],
      itemType: "fiscalYear",
    }),
  );

  // Filter to only ±1 year from today
  const parseDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const oneYearFromToday = new Date();
  oneYearFromToday.setDate(oneYearFromToday.getDate() + 365);
  const oneYearBeforeToday = new Date();
  oneYearBeforeToday.setDate(oneYearBeforeToday.getDate() - 365);

  const filterByStartDate = (data: any[]) =>
    data.filter((item) => {
      const startDate = parseDate(item.start_date);
      return (
        startDate &&
        startDate >= oneYearBeforeToday &&
        startDate <= oneYearFromToday
      );
    });

  fiscalWeekData = filterByStartDate(fiscalWeekData);
  fiscalMonthData = filterByStartDate(fiscalMonthData);
  fiscalYearData = filterByStartDate(fiscalYearData);

  const fiscalWeeksObj = convertArrayToObjectById(fiscalWeekData);
  const fiscalMonthsObj = convertArrayToObjectById(fiscalMonthData);
  const fiscalYearsObj = convertArrayToObjectById(fiscalYearData);

  res.status(200).json({
    history: historyData,
    recurring: recurringData,
    weeklyGoal,
    monthlyGoal,
    categories,
    tags,
    fiscalWeeks: fiscalWeeksObj,
    fiscalMonths: fiscalMonthsObj,
    fiscalYears: fiscalYearsObj,
  });
}

