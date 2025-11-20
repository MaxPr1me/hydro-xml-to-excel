import { loadXlsx } from './xlsxLoader';

export async function excelBufferToCsv(buffer: ArrayBuffer): Promise<string> {
  const xlsx = await loadXlsx();
  const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Workbook did not contain any worksheets.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error('Worksheet data could not be read.');
  }
  const csvText = xlsx.utils.sheet_to_csv(sheet);
  if (!csvText.trim()) {
    throw new Error('Worksheet did not contain any rows.');
  }
  return csvText;
}
