import { METADATA_RANGE } from "../../config/constants";
import { getSheetData, appendDataToSheet, columnMappings } from "../../utils/sheets";

/**
 * Adds missing tags to the metadata sheet
 * @param sheets - The sheets API instance
 * @param tags - Array of tags to add
 */
export async function addMissingTags(sheets: any, tags: string[]) {
  if (!tags || tags.length === 0) return;

  const listsRows = await getSheetData(sheets, METADATA_RANGE, false);
  const dataRows = listsRows.slice(1);
  const metadataMap = columnMappings.METADATA;

  // Get existing tags from the TAG column using the column mapping
  const existingTags = dataRows
    .map((row) => (row[metadataMap.TAG] ? row[metadataMap.TAG].trim() : ""))
    .filter(Boolean);

  const newTags = tags.filter((tag) => !existingTags.includes(tag));
  if (newTags.length === 0) return;

  // Create rows for new tags with empty values for CATEGORY column
  const rowsToAppend = newTags.map((tag) => {
    const rowData = new Array(Object.keys(metadataMap).length).fill("");
    rowData[metadataMap.TAG] = tag;
    return rowData;
  });

  await appendDataToSheet(sheets, METADATA_RANGE, rowsToAppend);
}
