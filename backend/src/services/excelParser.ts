import ExcelJS from 'exceljs'
import { ColumnMapping, ExcelRow, Sheet, SheetRow } from '../types'
import { UserInputError } from '../errors'

/** Reads the first worksheet into a table of displayed cell texts */
export async function readSheet(filePath: string): Promise<Sheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount === 0) {
    throw new UserInputError('הקובץ ריק')
  }

  const columnCount = worksheet.columnCount
  const rows: SheetRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    // cell.text returns the displayed value, including formula results
    const cells = Array.from({ length: columnCount }, (_, i) => row.getCell(i + 1).text.trim())
    rows.push({ rowNumber, cells })
  })

  return { columnCount, rows }
}

/**
 * Parses a number from cell text, ignoring currency symbols and spaces.
 * Supports both '12.50' and '12,50'.
 */
function parseNumber(text: string): number {
  let cleaned = text.replace(/[^\d.,-]/g, '')
  cleaned = cleaned.includes('.') ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.')
  return cleaned ? Number(cleaned) : NaN
}

/**
 * Extracts product rows according to the column mapping.
 * Rows without a code or a numeric price (empty rows, totals) are skipped.
 */
export function extractRows(sheet: Sheet, mapping: ColumnMapping): ExcelRow[] {
  const cell = (cells: string[], column: number | null) =>
    column === null ? '' : (cells[column - 1] ?? '')

  const rows: ExcelRow[] = []

  for (const { rowNumber, cells } of sheet.rows) {
    if (mapping.headerRow !== null && rowNumber <= mapping.headerRow) continue

    const article = cell(cells, mapping.article)
    const price = parseNumber(cell(cells, mapping.price))
    if (!article || Number.isNaN(price)) continue

    const pieces = parseNumber(cell(cells, mapping.pieces))

    rows.push({
      article,
      description: cell(cells, mapping.description),
      price: mapping.priceInCents ? price / 100 : price,
      pieces: Number.isNaN(pieces) ? 1 : pieces,
    })
  }

  if (rows.length === 0) {
    throw new UserInputError('לא נמצאו שורות עם קוד ומחיר בעמודות שנבחרו')
  }

  return rows
}
