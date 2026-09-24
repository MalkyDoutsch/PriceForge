import ExcelJS from 'exceljs'
import { ExcelRow } from '../types'
import { UserInputError } from '../errors'

type Field = keyof ExcelRow

/**
 * Accepted header names per field, in normalized form (see normalizeHeader).
 * Matching is exact, so 'code' does not match 'ean code'.
 */
const HEADER_ALIASES: Record<Field, string[]> = {
  article: ['articlecode', 'article', 'code', 'מקט', 'קוד'],
  description: ['articledescription', 'description', 'תיאור'],
  colorCode: ['colorcode'],
  colorDescription: ['colordescription'],
  size: ['size'],
  family: ['family'],
  price: ['price', 'מחיר'],
  ean: ['eancode', 'eancodes', 'ean'],
  pieces: ['pieces', 'qty', 'quantity', 'כמות'],
  segment: ['segment'],
  articleType: ['articletype'],
}

const REQUIRED_FIELDS: { field: Field; name: string }[] = [
  { field: 'article', name: 'קוד' },
  { field: 'price', name: 'מחיר' },
]

/** How many rows from the top to search for the header row */
const HEADER_SEARCH_ROWS = 10

/**
 * Lowercases, removes spaces/punctuation and unifies 'colour' → 'color'.
 * e.g. ' Price ' → 'price', 'Article code' → 'articlecode', 'מק"ט' → 'מקט'
 */
function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/colour/g, 'color')
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

/** Maps each recognized field to its column number in the given row */
function mapColumns(row: ExcelJS.Row): Partial<Record<Field, number>> {
  const columns: Partial<Record<Field, number>> = {}

  row.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.text)
    if (!header) return

    for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
      if (columns[field] === undefined && HEADER_ALIASES[field].includes(header)) {
        columns[field] = colNumber
        break
      }
    }
  })

  return columns
}

/**
 * Finds the header row within the first rows of the sheet:
 * the first row containing all required columns.
 * Throws UserInputError with the missing columns if none is found.
 */
function findHeaderRow(worksheet: ExcelJS.Worksheet) {
  let best: { rowNumber: number; columns: Partial<Record<Field, number>>; matched: number } | null = null
  const lastRow = Math.min(HEADER_SEARCH_ROWS, worksheet.rowCount)

  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber++) {
    const columns = mapColumns(worksheet.getRow(rowNumber))

    if (REQUIRED_FIELDS.every(({ field }) => columns[field] !== undefined)) {
      return { rowNumber, columns }
    }

    const matched = Object.keys(columns).length
    if (!best || matched > best.matched) {
      best = { rowNumber, columns, matched }
    }
  }

  if (!best) {
    throw new UserInputError('הקובץ ריק')
  }

  const bestColumns = best.columns
  const missing = REQUIRED_FIELDS.filter(({ field }) => bestColumns[field] === undefined)
    .map(({ name }) => name)
    .join(', ')

  const foundHeaders: string[] = []
  worksheet.getRow(best.rowNumber).eachCell((cell) => {
    if (cell.text.trim()) foundHeaders.push(cell.text.trim())
  })

  throw new UserInputError(
    `לא נמצאה עמודת ${missing}. הכותרות שנמצאו בקובץ: ${foundHeaders.join(', ') || '(אין)'}`
  )
}

export async function parseExcel(filePath: string): Promise<ExcelRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new UserInputError('הקובץ ריק')
  }

  const { rowNumber: headerRowNumber, columns } = findHeaderRow(worksheet)
  const rows: ExcelRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return

    // cell.text returns the displayed value, including formula results
    const get = (field: Field) => {
      const col = columns[field]
      return col === undefined ? '' : row.getCell(col).text.trim()
    }

    const article = get('article')
    const price = parseNumber(get('price'))
    if (!article || Number.isNaN(price)) return // skip empty / non-product rows

    const pieces = parseNumber(get('pieces'))

    rows.push({
      article,
      description: get('description'),
      colorCode: get('colorCode'),
      colorDescription: get('colorDescription'),
      size: get('size'),
      family: get('family'),
      price,
      ean: get('ean'),
      pieces: Number.isNaN(pieces) ? 1 : pieces,
      segment: get('segment'),
      articleType: get('articleType'),
    })
  })

  return rows
}
