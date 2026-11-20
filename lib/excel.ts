import * as XLSX from 'xlsx';

export function generateExcelBuffer(sheetsData: { sheetName: string; rows: any[] }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheetsData) {
    const ws =
      sheet.rows && sheet.rows.length > 0
        ? XLSX.utils.json_to_sheet(sheet.rows)
        : XLSX.utils.aoa_to_sheet([['No data available for this report']]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

