import { FiscalYear, FiscalMonth, FiscalWeek, IncomingObject } from "../types";
import {
  FISCAL_YEARS_RANGE,
  FISCAL_MONTHS_RANGE,
  FISCAL_WEEKS_RANGE,
} from "../config/constants";
import { getSheetData, columnMappings } from "./sheets";

// Cached fiscal data
export let cachedFiscalYears: FiscalYear[] | null = null;
export let cachedFiscalMonths: FiscalMonth[] | null = null;
export let cachedFiscalWeeks: FiscalWeek[] | null = null;

/**
 * Fetch and cache the fiscal data (years, months, weeks)
 * @param sheets - The sheets API instance
 */
export async function fetchAndCacheFiscalData(sheets: any): Promise<void> {
  if (cachedFiscalYears && cachedFiscalMonths && cachedFiscalWeeks) return;

  const [fyRows, fmRows, fwRows] = await Promise.all([
    getSheetData(sheets, FISCAL_YEARS_RANGE),
    getSheetData(sheets, FISCAL_MONTHS_RANGE),
    getSheetData(sheets, FISCAL_WEEKS_RANGE),
  ]);

  const fyMap = columnMappings.FISCAL_YEARS;
  cachedFiscalYears = fyRows.map((row) => ({
    id: row[fyMap.ID],
    title: row[fyMap.TITLE],
    start_date: row[fyMap.START_DATE],
    end_date: row[fyMap.END_DATE],
    itemType: "fiscalYear" as const,
  }));

  const fmMap = columnMappings.FISCAL_MONTHS;
  cachedFiscalMonths = fmRows.map((row) => ({
    id: row[fmMap.ID],
    start_date: row[fmMap.START_DATE],
    end_date: row[fmMap.END_DATE],
    year_title: row[fmMap.YEAR_TITLE],
    itemType: "fiscalMonth" as const,
  }));

  const fwMap = columnMappings.FISCAL_WEEKS;
  cachedFiscalWeeks = fwRows.map((row) => ({
    id: row[fwMap.ID],
    number: row[fwMap.NUMBER],
    start_date: row[fwMap.START_DATE],
    end_date: row[fwMap.END_DATE],
    year_title: row[fwMap.YEAR_TITLE],
    month_id: row[fwMap.MONTH_ID],
    itemType: "fiscalWeek" as const,
  }));
}

/**
 * Get fiscal IDs for a given item
 * @param item - The item to get fiscal IDs for
 * @param fiscalYears - Array of fiscal years
 * @param fiscalMonths - Array of fiscal months
 * @param fiscalWeeks - Array of fiscal weeks
 * @returns Object containing fiscal year, month, and week IDs
 */
export function getFiscalIDs(
  item: IncomingObject,
  fiscalYears: FiscalYear[],
  fiscalMonths: FiscalMonth[],
  fiscalWeeks: FiscalWeek[],
) {
  const date = new Date(item.date);
  if (isNaN(date.getTime())) {
    console.error(`Invalid date: ${item.date}`);
    return null;
  }
  const fy = fiscalYears.find((year) => {
    const start = new Date(year.start_date);
    const end = new Date(year.end_date);
    return date >= start && date <= end;
  });
  if (!fy) {
    console.error("No Fiscal Year found for date:", item.date);
    return null;
  }
  const fm = fiscalMonths.find((month) => {
    if (month.year_title !== fy.title) return false;
    const start = new Date(month.start_date);
    const end = new Date(month.end_date);
    return date >= start && date <= end;
  });
  if (!fm) {
    console.error("No Fiscal Month found for date:", item.date);
    return null;
  }
  const fw = fiscalWeeks.find((week) => {
    if (week.year_title !== fy.title || week.month_id !== fm.id) return false;
    const start = new Date(week.start_date);
    const end = new Date(week.end_date);
    return date >= start && date <= end;
  });
  if (!fw) {
    console.error("No Fiscal Week found for date:", item.date);
    return null;
  }
  return {
    fiscalYearId: fy.id,
    fiscalMonthId: fm.id,
    fiscalWeekId: fw.id,
  };
}

/**
 * Checks if the current fiscal week matches the provided fiscal week ID
 * @param fiscalWeekId - ID of the fiscal week to check
 * @param sheets - The sheets API instance
 * @returns Promise that resolves to true if the current fiscal week matches the provided ID, false otherwise
 */
export async function isSameFiscalWeekById(fiscalWeekId: string, sheets: any) {
  // Get the current date - set to start of day to avoid time issues
  const currentDate = new Date();

  // Find the current fiscal week by checking all weeks
  const allWeeks = await getSheetData(sheets, FISCAL_WEEKS_RANGE);
  let currentFiscalWeekId = null;

  const fwMap = columnMappings.FISCAL_WEEKS;

  for (const row of allWeeks) {
    // Skip header row
    if (
      row[fwMap.ID] === "ID" ||
      !row[fwMap.START_DATE] ||
      !row[fwMap.END_DATE]
    )
      continue;

    const startDate = new Date(row[fwMap.START_DATE]);
    // Adjust end date to end of day (23:59:59.999) for inclusive comparison
    const endDate = new Date(row[fwMap.END_DATE]);
    endDate.setHours(23, 59, 59, 999);

    if (currentDate >= startDate && currentDate <= endDate) {
      currentFiscalWeekId = row[fwMap.ID];
      break;
    }
  }

  if (!currentFiscalWeekId) {
    console.error("Could not determine current fiscal week");
    return false;
  }

  // Compare the item's fiscal week ID with the current fiscal week ID
  const result = fiscalWeekId === currentFiscalWeekId;
  return result;
}

/**
 * Checks if the current fiscal month matches the provided fiscal month ID
 * @param fiscalMonthId - ID of the fiscal month to check
 * @param sheets - The sheets API instance
 * @returns Promise that resolves to true if the current fiscal month matches the provided ID, false otherwise
 */
export async function isSameFiscalMonthById(
  fiscalMonthId: string,
  sheets: any,
) {
  // Get the current date
  const currentDate = new Date();

  // Find the current fiscal month by checking all months
  const allMonths = await getSheetData(sheets, FISCAL_MONTHS_RANGE);
  let currentFiscalMonthId = null;

  const fmMap = columnMappings.FISCAL_MONTHS;

  for (const row of allMonths) {
    // Skip header row
    if (
      row[fmMap.ID] === "ID" ||
      !row[fmMap.START_DATE] ||
      !row[fmMap.END_DATE]
    )
      continue;

    const startDate = new Date(row[fmMap.START_DATE]);
    // Adjust end date to end of day (23:59:59.999) for inclusive comparison
    const endDate = new Date(row[fmMap.END_DATE]);
    endDate.setHours(23, 59, 59, 999);

    if (currentDate >= startDate && currentDate <= endDate) {
      currentFiscalMonthId = row[fmMap.ID];
      break;
    }
  }

  if (!currentFiscalMonthId) {
    console.error("Could not determine current fiscal month");
    return false;
  }

  // Compare the item's fiscal month ID with the current fiscal month ID
  const result = fiscalMonthId === currentFiscalMonthId;
  return result;
}

/**
 * Converts an ISO date string to MM/DD/YYYY format
 * @param isoDateStr - ISO date string
 * @returns MM/DD/YYYY formatted date string
 */
export function convertToMMDDYYYY(isoDateStr: string): string {
  const date = new Date(isoDateStr);
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`;
}

/**
 * Checks if the provided type is an expense
 * @param type - Type to check
 * @returns true if the type is an expense, false otherwise
 */
export function isExpenseType(type: string) {
  return type.toLowerCase() === "expense";
}
