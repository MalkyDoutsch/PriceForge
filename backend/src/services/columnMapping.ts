import { ColumnMapping, MappedField, MappingSuggestion, Sheet } from '../types'
import { UserInputError } from '../errors'

/**
 * Accepted header names per field, in normalized form (see normalizeHeader).
 * Matching is exact, so 'code' does not match 'ean code'.
 */
const HEADER_ALIASES: Record<MappedField, string[]> = {
  article: ['articlecode', 'article', 'code', 'מקט', 'קוד'],
  description: ['articledescription', 'description', 'תיאור'],
  price: ['price', 'מחיר'],
  pieces: ['pieces', 'qty', 'quantity', 'כמות'],
}

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

/** Maps recognized header names in a row to their (1-based) column numbers */
function matchHeaders(cells: string[]): Partial<Record<MappedField, number>> {
  const columns: Partial<Record<MappedField, number>> = {}

  cells.forEach((text, i) => {
    const header = normalizeHeader(text)
    if (!header) return

    for (const field of Object.keys(HEADER_ALIASES) as MappedField[]) {
      if (columns[field] === undefined && HEADER_ALIASES[field].includes(header)) {
        columns[field] = i + 1
        break
      }
    }
  })

  return columns
}

/**
 * Suggests a mapping from header names: the header row is the first of the
 * top rows in which both the code and the price headers are recognized.
 * Returns an empty suggestion for sheets without recognizable headers.
 */
export function suggestMapping(sheet: Sheet): MappingSuggestion {
  for (const row of sheet.rows.slice(0, HEADER_SEARCH_ROWS)) {
    const columns = matchHeaders(row.cells)
    if (columns.article !== undefined && columns.price !== undefined) {
      return { headerRow: row.rowNumber, columns }
    }
  }
  return { headerRow: null, columns: {} }
}

function readColumn(value: unknown, name: string, columnCount: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > columnCount) {
    throw new UserInputError(`עמודת ${name} לא קיימת בקובץ`)
  }
  return value
}

function readOptionalColumn(value: unknown, name: string, columnCount: number): number | null {
  return value === null || value === undefined ? null : readColumn(value, name, columnCount)
}

/** Validates a mapping sent by the client against the sheet */
function parseColumnMapping(input: unknown, columnCount: number): ColumnMapping {
  const raw = (input ?? {}) as Record<string, unknown>

  if (raw.article === null || raw.article === undefined) throw new UserInputError('יש לבחור עמודת קוד')
  if (raw.price === null || raw.price === undefined) throw new UserInputError('יש לבחור עמודת מחיר')

  let headerRow: number | null = null
  if (raw.headerRow !== null && raw.headerRow !== undefined) {
    if (typeof raw.headerRow !== 'number' || !Number.isInteger(raw.headerRow) || raw.headerRow < 1) {
      throw new UserInputError('שורת הכותרות לא תקינה')
    }
    headerRow = raw.headerRow
  }

  return {
    article: readColumn(raw.article, 'קוד', columnCount),
    price: readColumn(raw.price, 'מחיר', columnCount),
    description: readOptionalColumn(raw.description, 'תיאור', columnCount),
    pieces: readOptionalColumn(raw.pieces, 'כמות', columnCount),
    headerRow,
    priceInCents: raw.priceInCents === true,
  }
}

/**
 * Returns the validated mapping sent by the client, or — when none was sent —
 * the mapping suggested by the headers (throws if code/price weren't recognized).
 */
export function resolveMapping(sheet: Sheet, input: unknown): ColumnMapping {
  if (input !== undefined) return parseColumnMapping(input, sheet.columnCount)

  const { headerRow, columns } = suggestMapping(sheet)
  if (columns.article === undefined || columns.price === undefined) {
    throw new UserInputError('לא זוהו עמודות קוד ומחיר לפי הכותרות, יש לבחור אותן במיפוי העמודות')
  }

  return {
    article: columns.article,
    price: columns.price,
    description: columns.description ?? null,
    pieces: columns.pieces ?? null,
    headerRow,
    priceInCents: false,
  }
}
