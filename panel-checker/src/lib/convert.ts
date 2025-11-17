import {
  SimpleZip,
  parseXml,
  resolveSheetTarget,
  extractSharedStrings,
  extractRowsFromWorksheet,
  tableToCsv
} from './parse';

export async function excelBufferToCsv(buffer: ArrayBuffer): Promise<string> {
  const zip = new SimpleZip(buffer);
  const workbookXml = await zip.readText('xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('Workbook metadata is missing.');
  }
  const workbookDoc = parseXml(workbookXml);
  const sheetNode = workbookDoc.getElementsByTagName('sheet')[0];
  if (!sheetNode) {
    throw new Error('Workbook did not contain any worksheets.');
  }
  const relId = sheetNode.getAttribute('r:id') ?? sheetNode.getAttribute('id');
  const relsXml = await zip.readText('xl/_rels/workbook.xml.rels');
  const sheetTarget = resolveSheetTarget(relsXml, relId);
  const worksheetXml = await zip.readText(sheetTarget);
  if (!worksheetXml) {
    throw new Error('Worksheet data could not be read.');
  }
  const sharedStringsXml = await zip.readText('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml ? extractSharedStrings(sharedStringsXml) : [];
  const table = extractRowsFromWorksheet(worksheetXml, sharedStrings);
  const csvText = tableToCsv(table);
  if (!csvText.trim()) {
    throw new Error('Worksheet did not contain any rows.');
  }
  return csvText;
}
